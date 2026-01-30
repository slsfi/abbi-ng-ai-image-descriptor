import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, catchError, map, Observable, of } from 'rxjs';

import { AiResult } from '../types/ai.types';
import { RequestSettings } from '../types/settings.types';

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  private readonly http = inject(HttpClient);

  /**
   * Validates the API key by starting a backend session.
   *
   * Backend behavior (per your new architecture):
   * - Validates the key once
   * - Stores it only in the server-side session (memory)
   * - Requires CSRF on POST (handled by your Angular interceptor)
   *
   * Return value:
   * - `true` if the session was started successfully (key accepted)
   * - `false` for any error (key invalid, network error, CSRF/session issue)
   */
  isValidApiKey(apiKey: string): Observable<boolean> {
    return this.http.post('/api/session/start', { provider: 'OpenAI', apiKey }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Sends an image description request via the backend relay.
   *
   * Why:
   * - Avoids calling OpenAI directly from the browser (CORS + API key exposure).
   * - The backend stores the API key only in the server-side session.
   *
   * Requirements:
   * - A valid OpenAI session must exist (created via POST /api/session/start).
   * - Cookies + CSRF are handled by Angular interceptors.
   */
  async describeImage(settings: RequestSettings, prompt: string, base64Image: string): Promise<AiResult> {
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
      return this.postResponses(payload);
    } catch (e) {
      return this.toAiResultErrorOpenAi(e);
    }
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

    try {
      return this.postResponses(payload);
    } catch (e) {
      return this.toAiResultErrorOpenAi(e);
    }
  }

  private async postResponses(payload: Record<string, unknown>): Promise<AiResult> {
    try {
      return await firstValueFrom(
        this.http.post<AiResult>('/api/openai/responses', { payload })
      );
    } catch (e) {
      return this.toAiResultErrorOpenAi(e);
    }
  }

  private toAiResultErrorOpenAi(e: unknown): AiResult {
    if (e instanceof HttpErrorResponse) {
      const msg =
        typeof e.error?.error?.message === 'string' ? e.error.error.message :
        typeof e.error?.message === 'string' ? e.error.message :
        'Backend request failed.';
      return { text: '', error: { code: e.status || 502, message: msg } };
    }

    const anyErr = e as any;
    return {
      text: '',
      error: { code: anyErr?.code ?? anyErr?.status ?? 500, message: anyErr?.message ?? 'OpenAI API error.' }
    };
  }

}
