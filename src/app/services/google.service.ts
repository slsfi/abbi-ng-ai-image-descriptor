import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { ApiError, GoogleGenAI, MediaResolution, ThinkingLevel,
         createPartFromUri, createUserContent
        } from '@google/genai';

import { AiResult } from '../types/ai.types';
import { ImageData } from '../types/image-data.types';
import { RequestSettings } from '../types/settings.types';

type DataUrlBlob = { mimeType: string; blob: Blob };
type ParsedDataUrl = { mimeType: string; dataBase64: string };

function dataUrlToBlob(dataUrl: string): DataUrlBlob | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl ?? '');
  if (!match) return null;

  const mimeType = match[1];
  const b64 = match[2];

  // Browser-safe base64 decode
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return { mimeType, blob: new Blob([bytes], { type: mimeType }) };
}

function parseDataUrl(dataUrl: string): ParsedDataUrl | null {
  // Expected: data:image/png;base64,AAAA...
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl ?? '');
  if (!match) return null;
  return { mimeType: match[1], dataBase64: match[2] };
}

@Injectable({ providedIn: 'root' })
export class GoogleService {
  private apiKey = '';
  private client: any = null;
  private modelList: any[] = [];

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

  isValidApiKey(apiKey: string): Observable<boolean> {
    const client = new GoogleGenAI({
      apiKey: apiKey,
      apiVersion: 'v1'
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

  async describeImage(settings: RequestSettings, prompt: string, base64Image: string): Promise<AiResult> {
    if (!this.client) {
      return { text: '', error: { code: 401, message: 'Google API key not set.' } };
    }

    // console.log('Prompt:', prompt);
    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt' } };
    }

    const parsed = parseDataUrl(base64Image);
    if (!parsed) {
      return { text: '', error: { code: 400, message: 'Invalid image data URL' } };
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

      const raw = await this.client.models
        .generateContent(payload)
        .catch(async (e: any) => {
          if (e instanceof ApiError) {
            console.error('API Error:', e);
            return { error: { code: e.status ?? 400, message: e.message ?? 'Google API error' } };
          } else {
            console.error('Unexpected Error:', e);
            return { error: { code: 500, message: 'Internal Server Error.' } };
          }
        });

      if (raw?.error) {
        return { text: '', error: raw.error, raw };
      }

      return {
        text: raw?.text ?? '',
        usage: {
          inputTokens: raw?.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: raw?.usageMetadata?.candidatesTokenCount ?? 0
        },
        raw
      };
    } catch (err: any) {
      return { text: '', error: { code: 500, message: err?.message ?? 'Error generating content using Google API' }, raw: err };
    }
  }

  async describeImages(settings: RequestSettings, prompt: string, base64Images: string[]): Promise<AiResult> {
    if (!this.client) {
      return { text: '', error: { code: 401, message: 'Google API key not set.' } };
    }

    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt' } };
    }

    if (!base64Images?.length) {
      return { text: '', error: { code: 400, message: 'No images provided' } };
    }

    // Parse all images first so we can fail fast with a good error
    const parsedImages: ParsedDataUrl[] = [];
    for (let i = 0; i < base64Images.length; i++) {
      const parsed = parseDataUrl(base64Images[i]);
      if (!parsed) {
        return { text: '', error: { code: 400, message: `Invalid image data URL at index ${i}` } };
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

      const raw = await this.client.models
        .generateContent(payload)
        .catch(async (e: any) => {
          if (e instanceof ApiError) {
            console.error('API Error:', e);
            return { error: { code: e.status ?? 400, message: e.message ?? 'Google API error' } };
          } else {
            console.error('Unexpected Error:', e);
            return { error: { code: 500, message: 'Internal Server Error.' } };
          }
        });

      if (raw?.error) {
        return { text: '', error: raw.error, raw };
      }

      return {
        text: raw?.text ?? '',
        usage: {
          inputTokens: raw?.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: raw?.usageMetadata?.candidatesTokenCount ?? 0
        },
        raw
      };
    } catch (err: any) {
      return {
        text: '',
        error: { code: 500, message: err?.message ?? 'Error generating content using Google API' },
        raw: err
      };
    }
  }

  async describeImagesWithFilesApi(settings: RequestSettings, prompt: string, images: ImageData[]): Promise<AiResult> {
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
        const up = await this.ensureUploadedViaFilesApi(images[i]);
        if (!up) {
          return { text: '', error: { code: 400, message: `Failed to upload image at index ${i}` } };
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

      const raw = await this.client.models
        .generateContent(payload)
        .catch(async (e: any) => {
          if (e instanceof ApiError) {
            console.error('API Error:', e);
            return { error: { code: e.status ?? 400, message: e.message ?? 'Google API error' } };
          } else {
            console.error('Unexpected Error:', e);
            return { error: { code: 500, message: 'Internal Server Error.' } };
          }
        });

      if (raw?.error) {
        return { text: '', error: raw.error, raw };
      }

      return {
        text: raw?.text ?? '',
        usage: {
          inputTokens: raw?.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: raw?.usageMetadata?.candidatesTokenCount ?? 0
        },
        raw
      };
    } catch (err: any) {
      return {
        text: '',
        error: { code: 500, message: err?.message ?? 'Error generating content using Google API' },
        raw: err
      };
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

      const raw = await this.client.models
        .generateContent(payload)
        .catch(async (e: any) => {
          if (e instanceof ApiError) {
            console.error('API Error:', e);
            return { error: { code: e.status ?? 400, message: e.message ?? 'Google API error' } };
          } else {
            console.error('Unexpected Error:', e);
            return { error: { code: 500, message: 'Internal Server Error.' } };
          }
        });

      if (raw?.error) {
        return { text: '', error: raw.error, raw };
      }

      return {
        text: raw?.text ?? '',
        usage: {
          inputTokens: raw?.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: raw?.usageMetadata?.candidatesTokenCount ?? 0
        },
        raw
      };
    } catch (err: any) {
      return { text: '', error: { code: 500, message: err?.message ?? 'Error generating content using Google API' }, raw: err };
    }
  }

  async deleteUploadedFile(image: ImageData): Promise<void> {
    if (!this.client) return;

    if (image.filesApiProvider !== 'Google' || !image.filesApiId) return;

    try {
      await this.client.files.delete({ name: image.filesApiId });
    } catch (e: any) {
      console.warn('Failed to delete Google file:', image.filesApiId, e);
    } finally {
      // Clear cached file reference
      image.filesApiId = undefined;
      image.filesApiUri = undefined;
      image.filesApiProvider = undefined;
      // Keep image.mimeType as-is (it still describes the local resized image)
    }
  }

  private async ensureUploadedViaFilesApi(
    image: ImageData
  ): Promise<{ name: string; uri: string; mimeType: string } | null> {
    if (!this.client) return null;

    // 1) Try to reuse cached upload (only if it's a Google upload)
    if (
      image.filesApiProvider === 'Google' &&
      image.filesApiId &&
      image.filesApiUri &&
      image.mimeType
    ) {
      try {
        const fetched = await this.client.files.get({ name: image.filesApiId });

        const name = fetched?.name ?? image.filesApiId;
        const uri = fetched?.uri ?? image.filesApiUri;
        const mimeType = fetched?.mimeType ?? image.mimeType;

        if (!name || !uri || !mimeType) {
          throw new Error('Incomplete Files API metadata');
        }

        // Refresh cached metadata
        image.filesApiId = name;
        image.filesApiUri = uri;
        image.mimeType = mimeType;
        image.filesApiProvider = 'Google';

        return { name, uri, mimeType };
      } catch (e: any) {
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

    try {
      const uploaded = await this.client.files.upload({
        file: converted.blob,
        config: { mimeType: converted.mimeType },
      });

      // Cache provider-agnostic fields on the ImageData object
      image.filesApiProvider = 'Google';
      image.filesApiId = uploaded?.name;           // used for get/delete
      image.filesApiUri = uploaded?.uri;           // used for prompting
      image.mimeType = uploaded?.mimeType ?? converted.mimeType;

      if (!image.filesApiId || !image.filesApiUri || !image.mimeType) {
        return null;
      }

      return { name: image.filesApiId, uri: image.filesApiUri, mimeType: image.mimeType };
    } catch (e: any) {
      console.error('Failed to upload file via Google Files API:', e);
      return null;
    }
  }

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
}
