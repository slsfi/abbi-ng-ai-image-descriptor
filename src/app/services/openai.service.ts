import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import OpenAI from 'openai';

import { Prompt } from '../types/prompt.types';
import { RequestSettings } from '../types/settings.types';

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  apiKey: string = '';
  client: any = null;
  modelList: any[] = [];

  constructor() {}

  updateClient(apiKey: string, orgKey?: string) {
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
    console.log('Prompt:', prompt);
    if (!prompt) {
      return { error: 'Missing prompt' }
    }
    try {
      const payload = {
        model: settings?.model?.id ?? 'gpt-4o',
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
        temperature: settings?.temperature ?? null,
        max_tokens: settings?.descriptionLength ? settings?.descriptionLength + 100 : null
      };
      console.log(payload);
      const response = await this.client.chat.completions.create(payload);
      return response;
    } catch (e: any) {
      return { error: e }
    }
  }
}
