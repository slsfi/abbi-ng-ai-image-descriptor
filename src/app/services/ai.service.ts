import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { GoogleService } from './google.service';
import { OpenAiService } from './openai.service';
import { SettingsService } from './settings.service';
import { AiResult } from '../types/ai.types';
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
      // Phase 5
      return Promise.resolve({
        text: '',
        error: { code: 400, message: 'Batch transcription is currently supported only for Google models.' }
      });
    }
    return Promise.resolve({ text: '', error: { code: 400, message: `Unsupported provider: ${settings.model.provider}` } });
  }

  // Keep the same method name for now to avoid churn.
  responsesTextTask(settings: RequestSettings, prompt: string): Promise<AiResult> {
    if (settings.model.provider === 'OpenAI') {
      return this.openAi.responsesTextTask(settings, prompt);
    } else if (settings.model.provider === 'Google') {
      return this.google.responsesTextTask(settings, prompt);
    }
    return Promise.resolve({ text: '', error: { code: 400, message: `Unsupported provider: ${settings.model.provider}` } });
  }

  private providerFromUI(): 'OpenAI' | 'Google' {
    return this.settings.selectedModel().provider;
  }
}
