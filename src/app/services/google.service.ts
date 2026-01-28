import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { ApiError, File, GenerateContentResponse, GoogleGenAI, MediaResolution,
         ThinkingLevel, createPartFromUri, createUserContent
        } from '@google/genai';

import { AiResult } from '../types/ai.types';
import { ImageData } from '../types/image-data.types';
import { RequestSettings } from '../types/settings.types';


type DataUrlBlob = { mimeType: string; blob: Blob };
type ParsedDataUrl = { mimeType: string; dataBase64: string };
type FilesApiUploadedFile = {
  name: string;
  uri: string;
  mimeType: string;
};


/**
 * Converts a base64 data URL (data:<mime>;base64,<...>) into a Blob.
 *
 * Used for Google Files API uploads which expect binary data.
 * Returns null if the input is not a valid base64 data URL.
 */
function dataUrlToBlob(dataUrl: string): DataUrlBlob | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl ?? '');
  if (!match) return null;

  const mimeType = match[1];
  const b64 = match[2];

  // Browser-safe base64 decode
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return { mimeType, blob: new Blob([bytes], { type: mimeType }) };
}

/**
 * Parses a base64 image data URL into (mimeType, base64Payload).
 *
 * This is used for inlineData requests (non-Files-API) where the SDK expects
 * a base64 payload without the "data:<mime>;base64," prefix.
 */
function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  // Expected: data:image/png;base64,AAAA...
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl ?? '');
  if (!match) return null;
  return { mimeType: match[1], dataBase64: match[2] };
}


@Injectable({
  providedIn: 'root'
})
export class GoogleService {
  private apiKey = '';
  private client: GoogleGenAI | null = null;
  private modelList: any[] = [];

  /**
   * Tracks in-flight uploads keyed by ImageData.id (not object
   * identity).
   *
   * ImageData objects may be replaced during UI/state updates;
   * using the stable id avoids losing the in-flight handle and
   * makes cancellation cleanup reliable.
   */
  private readonly uploadByImageId = new Map<string, Promise<FilesApiUploadedFile | null>>();

  /**
   * Tracks in-flight deletions by Files API resource name (e.g. "files/abc123").
   *
   * Cancellation and UI flows may trigger deletion for the same file multiple times
   * (cancel button, snackbar stop, batch loop finally blocks, delayed cleanup).
   * Deduplicating avoids repeated DELETE calls and prevents retry loops from
   * stacking up.
   */
  private readonly deleteByFileName = new Map<string, Promise<void>>();

  /**
   * Updates (or initializes) the Google GenAI SDK client for the given API key.
   *
   * The SDK client is recreated whenever the key changes.
   * Note: we intentionally do not force an apiVersion because preview models may
   * require v1beta for some config fields (thinkingConfig, mediaResolution).
   */
  updateClient(apiKey: string): void {
    if (apiKey !== this.apiKey) {
      this.apiKey = apiKey;
      this.client = new GoogleGenAI({
        apiKey: apiKey
        // NOTE: Do not force apiVersion to 'v1'.
        // Preview models (e.g. Gemini 3 Pro Preview) require v1beta
        // for thinkingConfig and mediaResolution.
      });
    }
  }

  /**
   * Performs a lightweight API call to validate an API key.
   *
   * Returns an Observable<boolean> which resolves to true if the key is accepted.
   */
  isValidApiKey(apiKey: string): Observable<boolean> {
    const client = new GoogleGenAI({
      apiKey: apiKey,
      apiVersion: 'v1'
    });

    return from(
      client.models.list().then(
        (result: any) => {
          // console.log(result);
          this.modelList = result?.pageInternal;
          // console.log(this.modelList);
          return true;
        }
      ).catch(() => false)
    );
  }

  async describeImage(settings: RequestSettings, prompt: string, base64Image: string): Promise<AiResult> {
    if (!this.client) {
      return { text: '', error: { code: 401, message: 'Google API key not set.' } };
    }

    // console.log('Prompt:', prompt);
    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt.' } };
    }

    const parsed = parseDataUrl(base64Image);
    if (!parsed) {
      return { text: '', error: { code: 400, message: 'Invalid image data URL.' } };
    }

    let maxOutputTokens = null;
    if (settings.taskType === 'altText') {
      maxOutputTokens = settings.descriptionLength ? settings.descriptionLength + 1000 : null;
    }

    try {
      const mediaResolution = this.mediaResolutionFromModel(settings);
      const thinkingLevel = this.thinkingLevelFromModel(settings);

      let thinkingBudget: number | null = settings.model.parameters?.thinkingBudget ?? null;
      if (thinkingLevel) {
        thinkingBudget = null;
      }

      const payload = {
        model: settings.model.id,
        contents: [
          {
            inlineData: {
              mimeType: parsed.mimeType,
              data: parsed.dataBase64,
            },
          },
          { text: prompt },
        ],
        config: {
          ...(maxOutputTokens ? { maxOutputTokens: maxOutputTokens } : {}),
          ...(mediaResolution ? { mediaResolution: mediaResolution } : {}),
          ...(settings.temperature ? { temperature: settings.temperature } : {}),
          ...(thinkingLevel ? { thinkingConfig: { thinkingLevel: thinkingLevel } } : {}),
          ...(thinkingBudget !== null ? { thinkingConfig: { thinkingBudget: thinkingBudget } } : {})
        }
      };
      // console.log(payload);

      const resp = await this.client.models.generateContent(payload);
      return this.responseToAiResult(resp);
    } catch (e) {
      return this.toAiResultErrorGoogle(e);
    }
  }

  async describeImages(settings: RequestSettings, prompt: string, base64Images: string[]): Promise<AiResult> {
    if (!this.client) {
      return { text: '', error: { code: 401, message: 'Google API key not set.' } };
    }

    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt.' } };
    }

    if (!base64Images?.length) {
      return { text: '', error: { code: 400, message: 'No images provided.' } };
    }

    // Parse all images first so we can fail fast with a good error
    const parsedImages: ParsedDataUrl[] = [];
    for (let i = 0; i < base64Images.length; i++) {
      const parsed = parseDataUrl(base64Images[i]);
      if (!parsed) {
        return { text: '', error: { code: 400, message: `Invalid image data URL at index ${i}.` } };
      }
      parsedImages.push(parsed);
    }

    let maxOutputTokens = null;
    if (settings.taskType === 'altText') {
      maxOutputTokens = settings.descriptionLength ? settings.descriptionLength + 1000 : null;
    }

    try {
      const mediaResolution = this.mediaResolutionFromModel(settings);
      const thinkingLevel = this.thinkingLevelFromModel(settings);

      let thinkingBudget: number | null = settings.model.parameters?.thinkingBudget ?? null;
      if (thinkingLevel) {
        thinkingBudget = null;
      }

      // Build contents as: [inlineData, inlineData, ..., {text: prompt}]
      const contents: any[] = parsedImages.map(p => ({
        inlineData: {
          mimeType: p.mimeType,
          data: p.dataBase64
        }
      }));
      contents.push({ text: prompt });

      const payload = {
        model: settings.model.id,
        contents,
        config: {
          ...(maxOutputTokens ? { maxOutputTokens } : {}),
          ...(mediaResolution ? { mediaResolution } : {}),
          ...(settings.temperature ? { temperature: settings.temperature } : {}),
          ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
          ...(thinkingBudget !== null ? { thinkingConfig: { thinkingBudget } } : {})
        }
      };

      const resp = await this.client.models.generateContent(payload);
      return this.responseToAiResult(resp);
    } catch (e) {
      return this.toAiResultErrorGoogle(e);
    }
  }

  /**
   * Runs a multi-image request using Google’s Files API:
   *  1) Upload each image via Files API
   *  2) Build prompt parts using the resulting file URIs
   *  3) Call models.generateContent(...)
   *
   * Cancellation:
   * - If `options.signal` is aborted while uploading or generating, this method returns
   *   an AiResult with error code 499 ("Request cancelled.").
   * - The underlying HTTP request may still complete (SDK-dependent); callers should
   *   run best-effort cleanup (deleteUploadedFile) when cancelling.
   */
  async describeImagesWithFilesApi(
    settings: RequestSettings,
    prompt: string,
    images: ImageData[],
    options?: { signal?: AbortSignal }
  ): Promise<AiResult> {
    const signal = options?.signal;

    if (!this.client) {
      return { text: '', error: { code: 401, message: 'Google API key not set.' } };
    }

    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt.' } };
    }

    if (!images?.length) {
      return { text: '', error: { code: 400, message: 'No images provided.' } };
    }

    try {
      const mediaResolution = this.mediaResolutionFromModel(settings);
      const thinkingLevel = this.thinkingLevelFromModel(settings);

      let thinkingBudget: number | null = settings.model.parameters?.thinkingBudget ?? null;
      if (thinkingLevel) {
        thinkingBudget = null;
      }

      // Upload/ensure uploaded in order
      const parts: any[] = [];

      for (let i = 0; i < images.length; i++) {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        const up = await this.ensureUploadedViaFilesApi(images[i], options);
        if (!up) {
          return { text: '', error: { code: 400, message: `Failed to upload image at index ${i}.` } };
        }
        parts.push(createPartFromUri(up.uri, up.mimeType));
      }

      // Then add the prompt text
      parts.push(prompt);

      const payload = {
        model: settings.model.id,
        contents: createUserContent(parts),
        config: {
          ...(mediaResolution ? { mediaResolution } : {}),
          ...(settings.temperature ? { temperature: settings.temperature } : {}),
          ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
          ...(thinkingBudget !== null ? { thinkingConfig: { thinkingBudget } } : {}),
        }
      };

      const resp = await this.abortable<GenerateContentResponse>(
        this.client.models.generateContent(payload),
        signal
      );
      return this.responseToAiResult(resp);
    } catch (e) {
      // If aborted, surface a clean error object; the caller will typically ignore it.
      if (e instanceof DOMException && e.name === 'AbortError') {
        return { text: '', error: { code: 499, message: 'Request cancelled.' }, raw: e };
      }
      return this.toAiResultErrorGoogle(e);
    }
  }

  async responsesTextTask(settings: RequestSettings, prompt: string): Promise<AiResult> {
    if (!this.client) {
      return { text: '', error: { code: 401, message: 'Google API key not set.' } };
    }

    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt.' } };
    }

    try {
      const thinkingLevel = this.thinkingLevelFromModel(settings);

      const payload = {
        model: settings.model.id,
        contents: prompt,
        config: {
          ...(thinkingLevel ? { thinkingConfig: { thinkingLevel: thinkingLevel } } : {})
        }
      };
      // console.log(payload);

      const resp = await this.client.models.generateContent(payload);
      return this.responseToAiResult(resp);
    } catch (e) {
      return this.toAiResultErrorGoogle(e);
    }
  }

  /**
   * Best-effort deletion of a Google Files API upload.
   *
   * This is used during cancellation cleanup to delete any uploaded file objects
   * associated with an ImageData instance.
   *
   * Key behaviors:
   * - If the image does not yet have `filesApiId`, the method attempts to resolve a
   *   just-finished in-flight upload (tracked internally) so it can still be deleted.
   * - Deletion is idempotent: 404 is treated as success (already deleted).
   * - Multiple delete requests for the same file name are deduplicated so we don't
   *   spam the API or stack retry loops.
   *
   * This method must never throw; cleanup is best-effort.
   */
  async deleteUploadedFile(image: ImageData): Promise<void> {
    if (!this.client) return;

    // If we don't have an id yet, try to resolve a just-finished in-flight upload.
    // Do NOT require filesApiProvider here: during upload it may not be set yet.
    if (!image.filesApiId) {
      const uploaded = await this.tryResolveInFlightUpload(image, 8000);
      if (uploaded) {
        image.filesApiProvider = 'Google';
        image.filesApiId = uploaded.name;
        image.filesApiUri = uploaded.uri;
        image.mimeType = uploaded.mimeType;
      }
    }

    if (!image.filesApiId) return;

    const name = image.filesApiId;

    // Clear cached file reference immediately (UI/state should move on even if cleanup fails).
    image.filesApiId = undefined;
    image.filesApiUri = undefined;
    image.filesApiProvider = undefined;

    // Deduplicate: if a delete for this file is already running, just await it.
    const existing = this.deleteByFileName.get(name);
    if (existing) {
      await existing;
      return;
    }

    const p = this.deleteWithRetry(name);
    this.deleteByFileName.set(name, p);

    try {
      await p;
    } finally {
      // Only clear if we're still the same promise (defensive against replacement).
      if (this.deleteByFileName.get(name) === p) {
        this.deleteByFileName.delete(name);
      }
    }
  }

  /**
   * Ensures that an ImageData has a corresponding Google Files API upload.
   *
   * Behavior:
   * - If ImageData already contains cached Files API identifiers (filesApiId/Uri) for Google,
   *   the method validates the file still exists via files.get and refreshes metadata.
   * - Otherwise it uploads the (resized) image bytes to Files API.
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
  ): Promise<FilesApiUploadedFile | null> {
    const signal = options?.signal;

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    
    if (!this.client) return null;

    // 1) Try to reuse cached upload (only if it's a Google upload)
    if (
      image.filesApiProvider === 'Google' &&
      image.filesApiId &&
      image.filesApiUri &&
      image.mimeType
    ) {
      try {
        const fetched = await this.abortable<File>(
          this.client.files.get({ name: image.filesApiId }),
          signal
        );

        const name = fetched?.name ?? image.filesApiId;
        const uri = fetched?.uri ?? image.filesApiUri;
        const mimeType = fetched?.mimeType ?? image.mimeType;

        if (!name || !uri || !mimeType) {
          throw new Error('Incomplete Files API metadata.');
        }

        // Refresh cached metadata
        image.filesApiId = name;
        image.filesApiUri = uri;
        image.mimeType = mimeType;
        image.filesApiProvider = 'Google';

        return { name, uri, mimeType };
      } catch (e: any) {
        // If the user cancelled, propagate AbortError so the caller
        // can stop immediately.
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

    // 2) Upload resized image bytes (base64 data url -> Blob)
    const converted = dataUrlToBlob(image.base64Image);
    if (!converted) return null;

    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (!this.client) return null;

    try {
      /**
       * Start the real upload without wrapping it in abortable().
       * Even if the user cancels, the underlying request may still
       * complete and create a file. We want to learn its id for
       * best-effort deletion.
       */
      const rawUpload = this.client.files.upload({
        file: converted.blob,
        config: { mimeType: converted.mimeType },
      }) as Promise<File>;

      // Normalize to the minimal shape we need and track it.
      const tracked: Promise<FilesApiUploadedFile | null> = rawUpload.then((u) => {
        if (!u?.name || !u?.uri) return null;
        return {
          name: u.name,
          uri: u.uri,
          mimeType: u.mimeType ?? converted.mimeType,
        };
      }).catch((e) => {
        console.warn('upload promise rejected', e);
        return null;
      });

      this.uploadByImageId.set(image.uploadKey, tracked);

      // IMPORTANT: do NOT delete immediately; keep for a short TTL
      // so cancel cleanup can use it.
      this.scheduleUploadEntryCleanup(image.uploadKey, tracked, 60_000);

      // For the normal generation flow, we still want to stop waiting immediately on cancel.
      const uploaded = await this.abortable(tracked, signal);
      if (!uploaded) return null;

      // Cache fields on ImageData
      image.filesApiProvider = 'Google';
      image.filesApiId = uploaded.name;
      image.filesApiUri = uploaded.uri;
      image.mimeType = uploaded.mimeType;

      // Since we now have a stable cached id, we can drop the in-flight entry early.
      // TTL cleanup already handles this, but this reduces memory pressure during
      // long sessions.
      if (this.uploadByImageId.get(image.uploadKey) === tracked) {
        this.uploadByImageId.delete(image.uploadKey);
      }

      return uploaded;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw e;
      }
      console.error('Failed to upload file via Google Files API:', e);
      return null;
    }
  }

  /**
   * Maps the UI model parameter (low/medium/high) to the SDK MediaResolution enum.
   */
  private mediaResolutionFromModel(settings: RequestSettings): MediaResolution | null {
    const modelMediaResolution = settings.model.parameters?.mediaResolution ?? null;
    const mediaResolution = modelMediaResolution === 'low'
      ? MediaResolution.MEDIA_RESOLUTION_LOW
      : modelMediaResolution === 'medium'
      ? MediaResolution.MEDIA_RESOLUTION_MEDIUM
      : modelMediaResolution === 'high'
      ? MediaResolution.MEDIA_RESOLUTION_HIGH
      : null
    return mediaResolution;
  }

  /**
   * Maps the UI model parameter (minimal/low/medium/high) to the SDK ThinkingLevel enum.
   */
  private thinkingLevelFromModel(settings: RequestSettings): ThinkingLevel | null {
    const modelThinkingLevel = settings.model.parameters?.thinkingLevel ?? null;
    const thinkingLevel = modelThinkingLevel === 'minimal'
      ? ThinkingLevel.MINIMAL
      : modelThinkingLevel === 'low'
      ? ThinkingLevel.LOW
      : modelThinkingLevel === 'medium'
      ? ThinkingLevel.MEDIUM
      : modelThinkingLevel === 'high'
      ? ThinkingLevel.HIGH
      : null
    return thinkingLevel;
  }

  /**
   * Converts an SDK GenerateContentResponse to the app's AiResult format.
   *
   * Keeps the raw response for debugging and attaches token usage if available.
   */
  private responseToAiResult(response?: GenerateContentResponse): AiResult {
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
  private resolveResponseText(response?: GenerateContentResponse): string {
    // return response?.text ?? response?.candidates?.[0].content?.parts?.[0].text ?? '';
    return response?.text ?? '';
  } 

  /**
   * Extracts prompt/input token count if the model provided usage metadata.
   */
  private resolveinputTokenCount(response?: GenerateContentResponse): number {
    return response?.usageMetadata?.promptTokenCount ?? 0;
  }

  /**
   * Extracts output token count (candidates + thoughts) if the model provided usage metadata.
   */
  private resolveOutputTokenCount(response?: GenerateContentResponse): number {
    const candidatesTokens = response?.usageMetadata?.candidatesTokenCount ?? 0;
    const thoughtsTokens = response?.usageMetadata?.thoughtsTokenCount ?? 0;
    return candidatesTokens + thoughtsTokens;
  }

  /**
   * Normalizes any thrown error into a valid `AiResult` error response.
   *
   * This method guarantees that:
   *  - The returned object always conforms to `AiResult`
   *  - `text` is present (empty string) so downstream code can rely on it
   *  - Google `ApiError` instances are mapped to a clean `{ code, message }` shape
   *  - Unexpected errors are safely converted to a generic 500 error
   */
  private toAiResultErrorGoogle(e: any): AiResult {
    if (e instanceof ApiError) {
      console.error('Google API Error:', e);
      return {
        text: '',
        error: {
          code: e.status ?? 400,
          message: this.extractGoogleApiMessage(e)
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
   * Extracts a clean, human-readable error message from a Google GenAI ApiError.
   *
   * The Google GenAI SDK frequently embeds the entire backend JSON error payload
   * (sometimes prefixed with the HTTP status code) into `ApiError.message`, e.g.:
   *
   *   "400 {\"error\":{\"code\":400,\"message\":\"...\",\"status\":\"INVALID_ARGUMENT\"}}"
   *
   * This helper attempts to:
   *  1) Detect and parse such embedded JSON payloads
   *  2) Prefer the backend-provided `error.message` field
   *  3) Fall back to the raw message if parsing fails
   *
   * This ensures that UI-facing error messages remain concise and readable,
   * and prevents leaking raw JSON blobs into snackbars or logs.
   */
  private extractGoogleApiMessage(e: ApiError): string {
    const raw = String(e.message ?? '').trim();
    const jsonStart = raw.indexOf('{');
    if (jsonStart >= 0) {
      try {
        const obj = JSON.parse(raw.slice(jsonStart));
        const msg = obj?.error?.message;
        if (typeof msg === 'string' && msg.trim()) return msg.trim();
      } catch {}
    }
    return raw || 'Google API error.';
  }

  /**
   * Makes an existing promise abortable using an AbortSignal.
   *
   * Important:
   * - This guarantees the *caller* stops waiting when aborted.
   * - It may or may not cancel the underlying network request, depending on whether
   *   the SDK uses fetch with AbortSignal internally. (We do not rely on that.)
   * - If aborted, the returned promise rejects with AbortError, but the original promise `p`
   *   is not cancelled unless the underlying SDK supports AbortSignal internally.
   */
  private abortable<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) {
      return p;
    }
    if (signal.aborted) {
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }

    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
      signal.addEventListener('abort', onAbort, { once: true });

      p.then(resolve, reject).finally(() => {
        signal.removeEventListener('abort', onAbort);
      });
    });
  }

  /**
   * Attempts to resolve an in-flight Files API upload for the given image.
   *
   * This is used during cancellation cleanup to handle the race where:
   * - the upload HTTP request completed, but the app was aborted before caching
   *   `filesApiId` onto the ImageData object.
   *
   * The wait is bounded by `timeoutMs` to keep cancellation responsive.
   */
  private async tryResolveInFlightUpload(
    image: ImageData,
    timeoutMs: number
  ): Promise<FilesApiUploadedFile | null> {
    const p = this.uploadByImageId.get(image.uploadKey);

    if (!p) return null;

    try {
      return await Promise.race([
        p,
        new Promise<FilesApiUploadedFile | null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
      ]);
    } catch {
      // Includes AbortError from abortable(upload, signal)
      return null;
    }
  }

  /**
   * Schedules removal of a tracked upload promise after a TTL.
   *
   * We keep finished upload promises around briefly to handle the cancellation race where:
   * - upload completes
   * - caller aborts before caching filesApiId onto ImageData
   * - cancellation cleanup needs to read the resolved upload (name/uri) to delete it
   *
   * The "only delete if same promise" check ensures that a newer upload for the same image id
   * is not accidentally removed.
   */
  private scheduleUploadEntryCleanup(
    key: string,
    p: Promise<FilesApiUploadedFile | null>,
    ttlMs: number
  ): void {
    void p.finally(() => {
      setTimeout(() => {
        // Only delete if nobody replaced the promise for this image id
        if (this.uploadByImageId.get(key) === p) {
          this.uploadByImageId.delete(key);
        }
      }, ttlMs);
    });
  }

  /**
   * Deletes a Google Files API object with retries for transient failures.
   *
   * Notes on status handling:
   * - 404 is treated as success (the file is already deleted).
   * - 403 is ambiguous in this API (it can mean "still in use" *or* "not found/no permission").
   *   We retry 403 only a small number of times to handle short-lived "in use" windows,
   *   but we stop quickly to avoid noisy repeated attempts once the file is effectively gone.
   * - 429 and 5xx are treated as retryable.
   */
  private async deleteWithRetry(name: string): Promise<void> {
    if (!this.client) return;

    // Retry delays (ms): 1s, 3s, 7s, 15s, 31s
    const delays = [1000, 3000, 7000, 15000, 31000];

    let retries403 = 0;
    const max403Retries = 2;

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        await this.client.files.delete({ name });
        return;
      } catch (e: any) {
        const status = e?.status ?? e?.code ?? e?.error?.code;

        if (status === 404) return; // already deleted

        if (status === 403) {
          retries403++;
          if (retries403 > max403Retries) {
            // Treat as non-retryable after a couple of attempts (likely already gone / inaccessible).
            return;
          }
        }

        const retryable =
          status === 403 ||
          status === 429 ||
          (typeof status === 'number' && status >= 500 && status < 600);

        if (!retryable || attempt === delays.length) {
          console.warn('Failed to delete Google file (best-effort):', name, e);
          return;
        }

        const jitter = Math.floor(Math.random() * 250);
        await new Promise<void>(resolve => setTimeout(resolve, delays[attempt] + jitter));
      }
    }
  }

}
