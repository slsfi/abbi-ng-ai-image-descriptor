import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { ApiError, GoogleGenAI, MediaResolution, ThinkingLevel } from '@google/genai';

import { AiResult } from '../types/ai.types';
import { RequestSettings } from '../types/settings.types';

type ParsedDataUrl = { mimeType: string; dataBase64: string };

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
