import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import OpenAI from 'openai';
import type { ResponseCreateParamsNonStreaming, ResponseInputMessageContentList } from 'openai/resources/responses/responses';
import type { ReasoningEffort } from 'openai/resources/shared';

import { AiResult } from '../types/ai.types';
import { OpenAiFilesApiUploadedFile } from '../types/files-api.types';
import { ImageData } from '../types/image-data.types';
import { RequestSettings } from '../types/settings.types';
import { dataUrlToBlob } from '../utils/data-url';
import { fileNameFromImage } from '../utils/file-name';
import { abortable, scheduleUploadEntryCleanup, tryResolveInFlightUpload } from '../utils/files-api';
import { isTemperatureSupportedForModel } from '../utils/model-parameters';

const OPENAI_FILES_API_EXPIRES_AFTER_SECONDS = 48 * 60 * 60;

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  private apiKey: string = '';
  private client: OpenAI | null = null;
  private modelList: any[] = [];

  /**
   * Tracks in-flight uploads keyed by ImageData.uploadKey.
   *
   * This allows cancellation cleanup to resolve a just-finished upload even if
   * the request was aborted before `filesApiId` could be written back onto the
   * ImageData instance.
   */
  private readonly uploadByImageId = new Map<string, Promise<OpenAiFilesApiUploadedFile | null>>();

  /**
   * Tracks in-flight deletions by OpenAI file id.
   *
   * Cancellation and batch cleanup may trigger deletion for the same file more
   * than once. Deduplicating avoids repeated DELETE calls and stacked retries.
   */
  private readonly deleteByFileId = new Map<string, Promise<void>>();

  /**
   * Updates (or initializes) the OpenAI SDK client for the given API key.
   *
   * The SDK client is recreated whenever the key changes.
   */
  updateClient(apiKey: string, orgKey?: string): void {
    if (apiKey !== this.apiKey) {
      this.apiKey = apiKey;
      this.client = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
        ...(orgKey && { organization: orgKey })
      });
    }
  }

  /**
   * Performs a lightweight API call to validate an API key.
   *
   * Returns an Observable<boolean> which resolves to true if the key is accepted.
   */
  isValidApiKey(apiKey: string): Observable<boolean> {
    const client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });

    return from(
      client.models.list().then(
        (result: any) => {
          this.modelList = result.data;
          // console.log(this.modelList);
          return true;
        }
      ).catch(() => false)
    );
  }

  /**
   * Runs a single-image multimodal request using an inline base64 data URL.
   */
  async describeImage(settings: RequestSettings, prompt: string, base64Image: string): Promise<AiResult> {
    if (!this.client) {
      return { text: '', error: { code: 401, message: 'OpenAI API key not set.' } };
    }

    // console.log('Prompt:', prompt);
    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt' } };
    }

    try {
      const payload = this.buildImageResponsePayload(settings, prompt, [
        {
          type: 'input_image',
          image_url: base64Image,
          detail: this.imageDetailFromSettings(settings)
        }
      ]);
      // console.log(payload);

      const resp = await this.client.responses.create(payload);
      return this.responseToAiResult(resp);
    } catch (e) {
      return this.toAiResultErrorOpenAi(e);
    }
  }

  /**
   * Runs a multi-image request using inline base64 image data URLs.
   *
   * Images are sent in-order as `input_image` items along with the prompt text.
   */
  async describeImages(settings: RequestSettings, prompt: string, base64Images: string[]): Promise<AiResult> {
    if (!this.client) {
      return { text: '', error: { code: 401, message: 'OpenAI API key not set.' } };
    }

    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt.' } };
    }

    if (!base64Images?.length) {
      return { text: '', error: { code: 400, message: 'No images provided.' } };
    }

    try {
      const imageDetail = this.imageDetailFromSettings(settings);
      const payload = this.buildImageResponsePayload(
        settings,
        prompt,
        base64Images.map(base64Image => ({
          type: 'input_image',
          image_url: base64Image,
          detail: imageDetail
        }))
      );

      const resp = await this.client.responses.create(payload);
      return this.responseToAiResult(resp);
    } catch (e) {
      return this.toAiResultErrorOpenAi(e);
    }
  }

  /**
   * Runs a multi-image request using OpenAI's Files API:
   *  1) Upload each image via Files API
   *  2) Reference each uploaded file id as an `input_image`
   *  3) Call responses.create(...)
   *
   * Cancellation:
   * - If `options.signal` is aborted while uploading or generating, this method returns
   *   an AiResult with error code 499 ("Request cancelled.").
   * - The underlying HTTP request may still complete (SDK-dependent); callers should
   *   run best-effort cleanup (deleteUploadedFile) when cancelling.
   *
   * File retention:
   * - Uploads are created with `expires_after = 48 hours` so they do not persist
   *   indefinitely if cleanup is missed.
   */
  async describeImagesWithFilesApi(
    settings: RequestSettings,
    prompt: string,
    images: ImageData[],
    options?: { signal?: AbortSignal }
  ): Promise<AiResult> {
    const signal = options?.signal;

    if (!this.client) {
      return { text: '', error: { code: 401, message: 'OpenAI API key not set.' } };
    }

    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt.' } };
    }

    if (!images?.length) {
      return { text: '', error: { code: 400, message: 'No images provided.' } };
    }

    try {
      const imageInputs: ResponseInputMessageContentList = [];
      const imageDetail = this.imageDetailFromSettings(settings);

      for (let i = 0; i < images.length; i++) {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        const uploaded = await this.ensureUploadedViaFilesApi(images[i], options);
        if (!uploaded) {
          return { text: '', error: { code: 400, message: `Failed to upload image at index ${i}.` } };
        }

        imageInputs.push({
          type: 'input_image',
          file_id: uploaded.id,
          detail: imageDetail
        });
      }

      const payload = this.buildImageResponsePayload(settings, prompt, imageInputs);
      const resp = await abortable(this.client.responses.create(payload), signal);
      return this.responseToAiResult(resp);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { text: '', error: { code: 499, message: 'Request cancelled.' }, raw: e };
      }
      return this.toAiResultErrorOpenAi(e);
    }
  }

  /**
   * Runs a text-only Responses API request.
   */
  async responsesTextTask(settings: RequestSettings, prompt: string): Promise<AiResult> {
    if (!this.client) {
      return { text: '', error: { code: 401, message: 'OpenAI API key not set.' } };
    }
    
    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt.' } };
    }

    const reasoningEffort: ReasoningEffort = settings.reasoningEffort ?? settings.model.parameters?.reasoningEffort ?? null;

    const payload = {
      model: settings.model.id,
      input: prompt,
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {})
    };
    // console.log(payload);

    try {
      const resp = await this.client.responses.create(payload);
      return this.responseToAiResult(resp);
    } catch (e) {
      return this.toAiResultErrorOpenAi(e);
    }
  }

  /**
   * Best-effort deletion of an OpenAI Files API upload.
   *
   * This is used during cancellation cleanup to delete any uploaded file objects
   * associated with an ImageData instance.
   *
   * Key behaviors:
   * - If the image does not yet have `filesApiId`, the method attempts to resolve a
   *   just-finished in-flight upload so it can still be deleted.
   * - Deletion is idempotent: 404 is treated as success (already deleted).
   * - Multiple delete requests for the same file id are deduplicated so we don't
   *   spam the API or stack retry loops.
   *
   * This method must never throw; cleanup is best-effort.
   */
  async deleteUploadedFile(image: ImageData): Promise<void> {
    if (!this.client) return;

    if (!image.filesApiId) {
      const uploaded = await tryResolveInFlightUpload(this.uploadByImageId, image.uploadKey, 8000);
      if (uploaded) {
        image.filesApiProvider = 'OpenAI';
        image.filesApiId = uploaded.id;
        image.filesApiUri = undefined;
        image.mimeType = uploaded.mimeType;
      }
    }

    if (!image.filesApiId) return;

    const fileId = image.filesApiId;

    image.filesApiId = undefined;
    image.filesApiUri = undefined;
    image.filesApiProvider = undefined;

    const existing = this.deleteByFileId.get(fileId);
    if (existing) {
      await existing;
      return;
    }

    const p = this.deleteWithRetry(fileId);
    this.deleteByFileId.set(fileId, p);

    try {
      await p;
    } finally {
      if (this.deleteByFileId.get(fileId) === p) {
        this.deleteByFileId.delete(fileId);
      }
    }
  }

  /**
   * Builds a shared multimodal Responses API payload for one or more images.
   *
   * Keeps OpenAI-specific parameter handling in one place so single-image,
   * inline-batch, and Files-API-batch requests stay behaviorally aligned.
   */
  private buildImageResponsePayload(
    settings: RequestSettings,
    prompt: string,
    imageInputs: ResponseInputMessageContentList
  ): ResponseCreateParamsNonStreaming {
    const reasoningEffort: ReasoningEffort = settings.reasoningEffort ?? settings.model.parameters?.reasoningEffort ?? null;
    const supportsTemperature = isTemperatureSupportedForModel(
      settings.model,
      settings.reasoningEffort,
      settings.thinkingLevel
    );
    const maxOutputTokens = settings.taskType === 'altText' && settings.descriptionLength
      ? settings.descriptionLength + 1000
      : null;

    return {
      model: settings.model.id,
      input: [{
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: prompt
          },
          ...imageInputs
        ],
      }],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      ...(supportsTemperature && settings.temperature !== null ? { temperature: settings.temperature } : {}),
      ...((!reasoningEffort || reasoningEffort === 'none') && maxOutputTokens !== null
        ? { max_output_tokens: maxOutputTokens }
        : {})
    };
  }
 
  /**
   * Resolves the effective image detail level for the selected model.
   */
  private imageDetailFromSettings(settings: RequestSettings) {
    return settings.model.parameters?.imageDetail ?? 'high';
  }

  /**
   * Ensures that an ImageData has a corresponding OpenAI Files API upload.
   *
   * Behavior:
   * - If ImageData already contains cached Files API identifiers for OpenAI,
   *   the method validates the file still exists via files.retrieve(...).
   * - Otherwise it uploads the image bytes to Files API with a 48-hour expiry.
   *
   * Cancellation:
   * - If `options.signal` is aborted, this method throws AbortError to allow the caller
   *   to stop quickly.
   *
   * Cancellation race handling:
   * - Upload completion is tracked in `uploadByImageId` even if the caller aborts waiting.
   *   This allows cancel-time cleanup to still discover the file id and delete it.
   */
  private async ensureUploadedViaFilesApi(
    image: ImageData,
    options?: { signal?: AbortSignal }
  ): Promise<OpenAiFilesApiUploadedFile | null> {
    const signal = options?.signal;

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (!this.client) return null;

    if (
      image.filesApiProvider === 'OpenAI' &&
      image.filesApiId &&
      image.mimeType
    ) {
      try {
        const fetched = await abortable(
          this.client.files.retrieve(image.filesApiId),
          signal
        );

        const id = fetched?.id ?? image.filesApiId;
        if (!id) {
          throw new Error('Incomplete Files API metadata.');
        }

        image.filesApiId = id;
        image.filesApiUri = undefined;
        image.filesApiProvider = 'OpenAI';

        return { id, mimeType: image.mimeType };
      } catch (e: any) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          throw e;
        }

        console.warn(
          'Cached Files API entry missing/expired; will re-upload:',
          image.filesApiId,
          e
        );

        image.filesApiId = undefined;
        image.filesApiUri = undefined;
        image.filesApiProvider = undefined;
      }
    }

    const converted = dataUrlToBlob(image.base64Image);
    if (!converted) return null;

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      const uploadFile = new File(
        [converted.blob],
        fileNameFromImage(image, converted.mimeType),
        { type: converted.mimeType }
      );

      const rawUpload = this.client.files.create({
        file: uploadFile,
        purpose: 'user_data',
        expires_after: {
          anchor: 'created_at',
          seconds: OPENAI_FILES_API_EXPIRES_AFTER_SECONDS
        }
      });

      const tracked: Promise<OpenAiFilesApiUploadedFile | null> = rawUpload.then((u) => {
        if (!u?.id) return null;
        return {
          id: u.id,
          mimeType: converted.mimeType
        };
      }).catch((e) => {
        console.warn('upload promise rejected', e);
        return null;
      });

      this.uploadByImageId.set(image.uploadKey, tracked);
      scheduleUploadEntryCleanup(this.uploadByImageId, image.uploadKey, tracked, 60_000);

      const uploaded = await abortable(tracked, signal);
      if (!uploaded) return null;

      image.filesApiProvider = 'OpenAI';
      image.filesApiId = uploaded.id;
      image.filesApiUri = undefined;
      image.mimeType = uploaded.mimeType;

      if (this.uploadByImageId.get(image.uploadKey) === tracked) {
        this.uploadByImageId.delete(image.uploadKey);
      }

      return uploaded;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw e;
      }
      console.error('Failed to upload file via OpenAI Files API:', e);
      return null;
    }
  }

  /**
   * Converts an SDK response to the app's AiResult format.
   *
   * Keeps the raw response for debugging and attaches token usage if available.
   */
  private responseToAiResult(response?: any): AiResult {
    return {
      text: this.resolveResponseText(response),
      usage: {
        inputTokens: this.resolveinputTokenCount(response),
        outputTokens: this.resolveOutputTokenCount(response)
      },
      raw: response
    };
  }

  /**
   * Extracts the response text from the SDK response.
   */
  private resolveResponseText(response?: any): string {
    return response?.output_text ?? '';
  } 

  /**
   * Extracts prompt/input token count if the model provided usage metadata.
   */
  private resolveinputTokenCount(response?: any): number {
    return response?.usage?.input_tokens ?? 0;
  }

  /**
   * Extracts output token count if the model provided usage metadata.
   */
  private resolveOutputTokenCount(response?: any): number {
    return response?.usage?.output_tokens ?? 0;
  }

  /**
   * Normalizes any thrown error into a valid `AiResult` error response.
   *
   * This method guarantees that:
   *  - The returned object always conforms to `AiResult`
   *  - `text` is present (empty string) so downstream code can rely on it
   *  - `OpenAI.APIError` instances are mapped to a clean `{ code, message }` shape
   *  - Unexpected errors are safely converted to a generic 500 error
   */
  private toAiResultErrorOpenAi(e: any): AiResult {
    if (e instanceof OpenAI.APIError) {
      console.error('OpenAI API Error:', e);
      return {
        text: '',
        error: {
          code: e.code ?? e.status ?? 400,
          message: String(e.message ?? 'OpenAI API error.')
        },
        raw: e
      };
    }

    console.error('Unexpected Error:', e);
    return {
      text: '',
      error: { code: 500, message: 'Internal Server Error.' },
      raw: e
    };
  }

  /**
   * Deletes an OpenAI Files API object with retries for transient failures.
   *
   * Notes on status handling:
   * - 404 is treated as success (the file is already deleted).
   * - 403, 409, 429, and 5xx are treated as retryable.
   */
  private async deleteWithRetry(fileId: string): Promise<void> {
    if (!this.client) return;

    const delays = [1000, 3000, 7000, 15000, 31000];

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        await this.client.files.delete(fileId);
        return;
      } catch (e: any) {
        const status = e?.status ?? e?.error?.code;

        if (status === 404) return;

        const retryable =
          status === 403 ||
          status === 409 ||
          status === 429 ||
          (typeof status === 'number' && status >= 500 && status < 600);

        if (!retryable || attempt === delays.length) {
          console.warn('Failed to delete OpenAI file (best-effort):', fileId, e);
          return;
        }

        const jitter = Math.floor(Math.random() * 250);
        await new Promise<void>(resolve => setTimeout(resolve, delays[attempt] + jitter));
      }
    }
  }

}
