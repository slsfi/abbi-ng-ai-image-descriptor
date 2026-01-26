import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import OpenAI from 'openai';

import { AiResult } from '../types/ai.types';
import { RequestSettings } from '../types/settings.types';

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  apiKey: string = '';
  client: any = null;
  modelList: any[] = [];

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

  async describeImage(settings: RequestSettings, prompt: string, base64Image: string): Promise<AiResult> {
    if (!this.client) {
      return { text: '', error: { code: 401, message: 'OpenAI API key not set.' } };
    }

    // console.log('Prompt:', prompt);
    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt' } };
    }

    let maxOutputTokens = null;
    if (settings.taskType === 'altText') {
      maxOutputTokens = settings.descriptionLength ? settings.descriptionLength + 1000 : null;
    }

    const reasoningEffort: string | null = settings.model.parameters?.reasoningEffort ?? null;

    const payload = {
      model: settings.model.id,
      input : [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt
            },
            {
              type: 'input_image',
              image_url: base64Image,
              detail: 'high'
            },
          ],
        }
      ],
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      ...((!reasoningEffort || reasoningEffort === 'none') ? { temperature: settings.temperature ?? null } : {}),
      ...((!reasoningEffort || reasoningEffort === 'none') ? { max_output_tokens: maxOutputTokens } : {})
    };
    // console.log(payload);

    try {
      const resp = await this.client.responses.create(payload);
      return this.responseToAiResult(resp);
    } catch (e) {
      return this.toAiResultErrorOpenAi(e);
    }
  }

  async responsesTextTask(settings: RequestSettings, prompt: string): Promise<AiResult> {
    if (!this.client) {
      return { text: '', error: { code: 401, message: 'OpenAI API key not set.' } };
    }
    
    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt.' } };
    }

    const reasoningEffort: string | null = settings.model.parameters?.reasoningEffort ?? null;

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

  private resolveResponseText(response?: any): string {
    return response?.output_text ?? '';
  } 

  private resolveinputTokenCount(response?: any): number {
    return response?.usage?.input_tokens ?? 0;
  }

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

}
