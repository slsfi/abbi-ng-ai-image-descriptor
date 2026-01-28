import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { GoogleService } from './google.service';
import { OpenAiService } from './openai.service';
import { SettingsService } from './settings.service';
import { AiResult } from '../types/ai.types';
import { ImageData } from '../types/image-data.types';
import { RequestSettings } from '../types/settings.types';

/**
 * Facade service for AI providers.
 */
@Injectable({
  providedIn: 'root'
})
export class AiService {
  private readonly google = inject(GoogleService);
  private readonly openAi = inject(OpenAiService);
  private readonly settings = inject(SettingsService);

  updateClient(apiKey: string, orgKey?: string): void {
    const provider = this.providerFromUI();
    if (provider === 'OpenAI') {
      this.openAi.updateClient(apiKey, orgKey);
    } else if (provider === 'Google') {
      this.google.updateClient(apiKey);
    }
  }

  isValidApiKey(apiKey: string): Observable<boolean> {
    const provider = this.providerFromUI();
    if (provider === 'OpenAI') {
      return this.openAi.isValidApiKey(apiKey);
    } else if (provider === 'Google') {
      return this.google.isValidApiKey(apiKey);
    }
    console.error(`Unsupported provider: ${provider}`);
    return of(false);
  }

  describeImage(settings: RequestSettings, prompt: string, base64Image: string): Promise<AiResult> {
    if (settings.model.provider === 'OpenAI') {
      return this.openAi.describeImage(settings, prompt, base64Image);
    } else if (settings.model.provider === 'Google') {
      return this.google.describeImage(settings, prompt, base64Image);
    }
    return Promise.resolve({ text: '', error: { code: 400, message: `Unsupported provider: ${settings.model.provider}` } });
  }

  describeImages(settings: RequestSettings, prompt: string, base64Images: string[]): Promise<AiResult> {
    if (settings.model.provider === 'Google') {
      return this.google.describeImages(settings, prompt, base64Images);
    } else if (settings.model.provider === 'OpenAI') {
      return Promise.resolve({
        text: '',
        error: { code: 400, message: 'Batch transcription is currently supported only for Google models.' }
      });
    }
    return Promise.resolve({ text: '', error: { code: 400, message: `Unsupported provider: ${settings.model.provider}` } });
  }

  /**
   * Executes a Files API based multi-image request.
   *
   * @param options Optional request options (currently: AbortSignal).
   *                When aborted, the provider call should reject/short-circuit.
   */
  describeImagesFilesApi(
    settings: RequestSettings,
    prompt: string,
    images: ImageData[],
    options?: { signal?: AbortSignal }
  ): Promise<AiResult> {
    if (settings.model.provider === 'Google') {
      return this.google.describeImagesWithFilesApi(settings, prompt, images, options);
    }
    return Promise.resolve({ text: '', error: { code: 400, message: 'Files API batching not supported for this provider yet.' } });
  }

  responsesTextTask(settings: RequestSettings, prompt: string): Promise<AiResult> {
    if (settings.model.provider === 'OpenAI') {
      return this.openAi.responsesTextTask(settings, prompt);
    } else if (settings.model.provider === 'Google') {
      return this.google.responsesTextTask(settings, prompt);
    }
    return Promise.resolve({ text: '', error: { code: 400, message: `Unsupported provider: ${settings.model.provider}` } });
  }

  /**
   * Best-effort deletion of any provider-side uploaded file associated with an
   * ImageData.
   *
   * Routing rules:
   * - If `filesApiProvider` is known, delete via that provider only.
   * - If provider is not set yet (common during an in-flight upload), attempt
   *   Google cleanup because Google Files API uploads are the only ones
   *   currently used in this flow and GoogleService can resolve in-flight
   *   uploads by image id.
   *
   * This method must never throw.
   */
  async deleteUploadedFile(image: ImageData): Promise<void> {
    try {
      if (image.filesApiProvider === 'Google') {
        await this.google.deleteUploadedFile(image);
        return;
      }

      // if (image.filesApiProvider === 'OpenAI') {
      //   await this.openAi.deleteUploadedFile(image);
      //   return;
      // }

      // Provider not set yet:
      // Try Google because it can resolve just-finished uploads (cancel race).
      await this.google.deleteUploadedFile(image);
    } catch {
      // best-effort: swallow
    }
  }

  private providerFromUI(): 'OpenAI' | 'Google' {
    return this.settings.selectedModel().provider;
  }
}
