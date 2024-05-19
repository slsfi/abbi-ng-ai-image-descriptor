import { Injectable } from '@angular/core';
import OpenAI from 'openai';

import { RequestSettings } from '../types/settingsTypes';

@Injectable({
  providedIn: 'root'
})
export class OpenaiService {
  client: any = null;

  constructor() { }

  updateClient(apiKey: string, orgKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
      ...(orgKey && { organization: orgKey })
    });
  }

  async isValidApiKey(apiKey: string): Promise<boolean> {
    const client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });

    try {
      const list = await client.models.list();
      this.client = client;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async describeImage(settings: RequestSettings, base64Image: string): Promise<any> {
    try {
      const payload = {
        model: settings?.model?.id ?? 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe what this image depicts in about 300 characters.' },
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
        max_tokens: settings?.maxLength ? settings?.maxLength + 100 : null
      };
      console.log(payload);
      const response = await this.client.chat.completions.create(payload);
      return response;
    } catch (e: any) {
      return { error: e }
    }
  }
}
