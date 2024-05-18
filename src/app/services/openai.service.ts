import { Injectable } from '@angular/core';
import OpenAI from 'openai';

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

  async describeImage(base64Image: string) {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe what this image depicts in about 300 characters.' },
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
      });
      return response;
    } catch (e: any) {
      return { error: e }
    }
  }
}
