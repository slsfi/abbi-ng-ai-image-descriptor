import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { RequestSettings } from '../types/settings.types';
import { OpenAiService } from './openai.service';

/**
 * Facade service for AI providers.
 */
@Injectable({
  providedIn: 'root'
})
export class AiService {
  private readonly openAi = inject(OpenAiService);

  updateClient(apiKey: string, orgKey?: string): void {
    this.openAi.updateClient(apiKey, orgKey);
  }

  isValidApiKey(apiKey: string): Observable<boolean> {
    return this.openAi.isValidApiKey(apiKey);
  }

  describeImage(settings: RequestSettings, prompt: string, base64Image: string): Promise<any> {
    return this.openAi.describeImage(settings, prompt, base64Image);
  }

  // Keep the same method name for now to avoid churn.
  responsesTextTask(settings: RequestSettings, prompt: string): Promise<any> {
    return this.openAi.responsesTextTask(settings, prompt);
  }
}

