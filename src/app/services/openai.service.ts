import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import OpenAI from 'openai';

import { RequestSettings } from '../types/settings.types';

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  apiKey: string = '';
  client: any = null;
  modelList: any[] = [];

  constructor() { }

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

  async describeImage(settings: RequestSettings, prompt: string, base64Image: string): Promise<any> {
    // console.log('Prompt:', prompt);
    if (!prompt) {
      return { error: { status: 400, message: 'Missing prompt' }};
    }

    let max_tokens = null;
    if (settings?.promptTemplate === 'Alt text') {
      max_tokens = settings?.descriptionLength ? settings?.descriptionLength + 1000 : null;
    }

    const reasoning_effort: string | null = settings?.model?.reasoning ?? null;

    const payload = {
      model: settings?.model?.id ?? 'gpt-4.1',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: base64Image,
                detail: 'high'
              },
            },
          ],
        }
      ],
      ...(reasoning_effort ? { reasoning_effort: reasoning_effort } : {}),
      temperature: settings?.temperature ?? null,
      ...(!reasoning_effort ? { max_completion_tokens: max_tokens } : {})
    };
    // console.log(payload);

    const response = await this.client.chat.completions
      .create(payload)
      .catch(async (err: any) => {
        if (err instanceof OpenAI.APIError) {
          console.error('API Error:', err.status, err.name, err.headers);
          return { error: { status: err.status, message: err.name }};
        } else {
          console.error('Unexpected Error:', err);
          return { error: { status: 500, message: 'Internal Server Error' }};
        }
      });
    return response;
  }

  async chatCompletionTextTask(settings: RequestSettings, prompt: string): Promise<any> {
    if (!prompt) {
      return { error: { status: 400, message: 'Missing prompt' }};
    }

    const reasoning_effort: string | null = settings?.model?.reasoning ?? null;

    const payload = {
      model: settings?.model?.id ?? 'gpt-4.1',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt },
          ],
        }
      ],
      ...(reasoning_effort ? { reasoning_effort: reasoning_effort } : {})
    };
    // console.log(payload);

    const response = await this.client.chat.completions
      .create(payload)
      .catch(async (err: any) => {
        if (err instanceof OpenAI.APIError) {
          console.error('API Error:', err.status, err.name, err.headers);
          return { error: { status: err.status, message: err.name }};
        } else {
          console.error('Unexpected Error:', err);
          return { error: { status: 500, message: 'Internal Server Error' }};
        }
      });
    return response;
  }
}
