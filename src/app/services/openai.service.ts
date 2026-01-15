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
    // console.log('Prompt:', prompt);
    if (!prompt) {
      return { text: '', error: { code: 400, message: 'Missing prompt' } };
    }

    let max_tokens = null;
    if (settings.taskType === 'altText') {
      max_tokens = settings.descriptionLength ? settings.descriptionLength + 1000 : null;
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
      ...((!reasoningEffort || reasoningEffort === 'none') ? { max_output_tokens: max_tokens } : {})
    };
    // console.log(payload);

    const raw = await this.client.responses
      .create(payload)
      .catch(async (err: any) => {
        if (err instanceof OpenAI.APIError) {
          console.error('API Error:', err);
          return { error: { code: err.code ?? 400, message: err.message ?? 'OpenAI API error' } };
        } else {
          console.error('Unexpected Error:', err);
          return { error: { code: 500, message: 'Internal Server Error.' } };
        }
      });

    if (raw?.error) {
      return { text: '', error: raw.error, raw };
    }

    return {
      text: raw?.output_text ?? '',
      usage: {
        inputTokens: raw?.usage?.input_tokens ?? 0,
        outputTokens: raw?.usage?.output_tokens ?? 0
      },
      raw
    };
  }

  async responsesTextTask(settings: RequestSettings, prompt: string): Promise<AiResult> {
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

    const raw = await this.client.responses
      .create(payload)
      .catch(async (err: any) => {
        if (err instanceof OpenAI.APIError) {
          console.error('API Error:', err);
          return { error: { code: err.code ?? 400, message: err.message } };
        } else {
          console.error('Unexpected Error:', err);
          return { error: { code: 500, message: 'Internal Server Error.' }};
        }
      });
    
    if (raw?.error) {
      return { text: '', error: raw.error, raw };
    }

    return {
      text: raw?.output_text ?? '',
      usage: {
        inputTokens: raw?.usage?.input_tokens ?? 0,
        outputTokens: raw?.usage?.output_tokens ?? 0
      },
      raw
    };
  }
}
