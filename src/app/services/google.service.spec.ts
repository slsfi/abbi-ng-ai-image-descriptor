import { GoogleService } from './google.service';
import { ApiError } from '@google/genai';
import type { Interactions } from '@google/genai';
import { ImageData } from '../types/image-data.types';
import { RequestSettings } from '../types/settings.types';

function createSettings(overrides: Partial<RequestSettings> = {}): RequestSettings {
  return {
    model: {
      provider: 'Google',
      name: 'Test model',
      id: 'gemini-3.1-pro-preview',
      inputPrice: 0,
      outputPrice: 0,
      rpm: 1,
      supportedTaskTypes: ['altText'],
      url: 'https://example.com',
      parameters: {},
    },
    taskType: 'altText',
    temperature: 0.4,
    reasoningEffort: null,
    thinkingLevel: 'low',
    descriptionLength: 175,
    promptVariant: {
      id: 'default',
      label: 'Default',
      prompt: 'Test prompt',
    },
    includeFilename: true,
    teiEncode: false,
    encodeLineBreakTypes: true,
    batchSize: 10,
    ...overrides,
  };
}

function createImage(overrides: Partial<ImageData> = {}): ImageData {
  return {
    id: 1,
    filename: 'page-1.png',
    base64Image: 'data:image/png;base64,AAAA',
    height: 1000,
    width: 800,
    descriptions: [],
    activeDescriptionIndex: -1,
    generating: false,
    uploadKey: 'upload-1',
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}

describe('GoogleService', () => {
  function mockInteraction(response: Partial<Interactions.Interaction> = {}) {
    const service = new GoogleService();
    const interaction: Interactions.Interaction = {
      id: 'test-interaction',
      status: 'completed',
      output_text: 'ok',
      ...response,
    };
    const createSpy = vi.fn().mockResolvedValue(interaction);
    const files = {
      upload: vi.fn(),
      get: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    };
    (service as any).client = { interactions: { create: createSpy }, files };
    return { service, createSpy, interaction, files };
  }

  it('sends Interactions input and config and maps text and token usage', async () => {
    const { service, createSpy, interaction } = mockInteraction({
      output_text: 'A landscape.',
      usage: {
        total_input_tokens: 7,
        total_output_tokens: 23,
        total_thought_tokens: 49,
        total_tokens: 79,
      },
    });
    const settings = createSettings({
      model: {
        ...createSettings().model,
        parameters: { mediaResolution: 'high', thinkingLevel: 'high' },
      },
    });

    const result = await service.describeImage(settings, 'Prompt', 'data:image/png;base64,AAAA');

    expect(createSpy).toHaveBeenCalledWith({
      model: settings.model.id,
      input: [
        { type: 'text', text: 'Prompt' },
        { type: 'image', data: 'AAAA', mime_type: 'image/png', resolution: 'high' },
      ],
      generation_config: {
        max_output_tokens: 1175,
        temperature: 0.4,
        thinking_level: 'low',
      },
      store: false,
    });
    expect(result).toEqual({
      text: 'A landscape.',
      usage: { inputTokens: 7, outputTokens: 72 },
      raw: interaction,
    });
  });

  it('keeps temperature in the payload when the model does not opt out', async () => {
    const { service, createSpy } = mockInteraction();

    await service.describeImage(createSettings(), 'Prompt', 'data:image/png;base64,AAAA');

    const payload = createSpy.mock.lastCall![0];
    expect(payload.generation_config.temperature).toBe(0.4);
  });

  it('omits temperature when the model opts out and thinking is enabled', async () => {
    const { service, createSpy } = mockInteraction();

    await service.describeImage(createSettings({
      model: {
        ...createSettings().model,
        parameters: {
          reasoningSupportsTemperature: false,
        },
      },
    }), 'Prompt', 'data:image/png;base64,AAAA');

    const payload = createSpy.mock.lastCall![0];
    expect('temperature' in payload.generation_config).toBe(false);
  });

  it('omits temperature when the model does not support temperature sampling', async () => {
    const { service, createSpy } = mockInteraction();

    await service.describeImage(createSettings({
      model: {
        ...createSettings().model,
        id: 'gemini-3.8-flash',
        parameters: {
          supportsTemperatureSampling: false,
        },
      },
      thinkingLevel: null,
    }), 'Prompt', 'data:image/png;base64,AAAA');

    const payload = createSpy.mock.lastCall![0];
    expect('temperature' in payload.generation_config).toBe(false);
  });

  it.each(['minimal', 'low', 'medium', 'high'] as const)(
    'uses the model default thinking level %s when no UI level is selected', async thinkingLevel => {
      const { service, createSpy } = mockInteraction();
      const settings = createSettings({
        thinkingLevel: null,
        model: { ...createSettings().model, parameters: { thinkingLevel } },
      });

      await service.describeImage(settings, 'Prompt', 'data:image/jpeg;base64,AAAA');

      expect(createSpy.mock.lastCall![0].generation_config.thinking_level).toBe(thinkingLevel);
    }
  );

  it('omits unset options and leaves transcription output uncapped', async () => {
    const { service, createSpy } = mockInteraction();

    await service.describeImage(createSettings({
      taskType: 'transcription',
      thinkingLevel: null,
      temperature: null,
    }), 'Prompt', 'data:image/jpeg;base64,AAAA');

    const payload = createSpy.mock.lastCall![0];
    expect(payload.generation_config).toEqual({});
    expect(payload.input[1]).toEqual({ type: 'image', data: 'AAAA', mime_type: 'image/jpeg' });
  });

  it('defaults missing output and usage to empty text and zero tokens', async () => {
    const { service } = mockInteraction({ output_text: undefined });

    const result = await service.describeImage(createSettings(), 'Prompt', 'data:image/png;base64,AAAA');

    expect(result.text).toBe('');
    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it('returns partial output from an incomplete interaction', async () => {
    const { service } = mockInteraction({ status: 'incomplete', output_text: 'Partial text' });

    const result = await service.describeImage(createSettings(), 'Prompt', 'data:image/png;base64,AAAA');

    expect(result.text).toBe('Partial text');
    expect(result.error).toBeUndefined();
  });

  it('surfaces a failed interaction', async () => {
    const { service } = mockInteraction({
      status: 'failed',
      output_text: undefined,
      errors: [{ code: 'model_error', message: 'Generation failed.' }],
    });

    const result = await service.describeImage(createSettings(), 'Prompt', 'data:image/png;base64,AAAA');

    expect(result.error).toEqual({ code: 'model_error', message: 'Generation failed.' });
  });

  it('surfaces a cancelled interaction', async () => {
    const { service } = mockInteraction({ status: 'cancelled', output_text: undefined });

    const result = await service.describeImage(createSettings(), 'Prompt', 'data:image/png;base64,AAAA');

    expect(result.error).toEqual({ code: 499, message: 'Request cancelled.' });
  });

  it.each([
    new ApiError({ status: 429, message: '429 {"error":{"message":"Rate limit exceeded."}}' }),
    Object.assign(new Error('429 {"error":{"message":"Rate limit exceeded."}}'), { status: 429 }),
  ])('preserves HTTP status and message for SDK errors: %s', async error => {
    const { service, createSpy } = mockInteraction();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    createSpy.mockRejectedValue(error);

    try {
      const result = await service.describeImage(createSettings(), 'Prompt', 'data:image/png;base64,AAAA');

      expect(result.error).toEqual({ code: 429, message: 'Rate limit exceeded.' });
      expect(result.raw).toBe(error);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it.each([
    { prompt: '', image: 'data:image/png;base64,AAAA', message: 'Missing prompt.' },
    { prompt: 'Prompt', image: 'invalid', message: 'Invalid image data URL.' },
  ])('rejects invalid input before making a request: $message', async ({ prompt, image, message }) => {
    const { service, createSpy } = mockInteraction();

    const result = await service.describeImage(createSettings(), prompt, image);

    expect(result.error).toEqual({ code: 400, message });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('sends text before inline images, preserving image order, MIME types, and resolution', async () => {
    const { service, createSpy, interaction } = mockInteraction({
      output_text: 'Two images.',
      usage: { total_input_tokens: 10, total_output_tokens: 20, total_thought_tokens: 5 },
    });
    const settings = createSettings({
      model: { ...createSettings().model, parameters: { mediaResolution: 'high' } },
    });

    const result = await service.describeImages(settings, 'Prompt', [
      'data:image/png;base64,AAAA', 'data:image/jpeg;base64,BBBB',
    ]);

    expect(createSpy).toHaveBeenCalledWith({
      model: settings.model.id,
      input: [
        { type: 'text', text: 'Prompt' },
        { type: 'image', data: 'AAAA', mime_type: 'image/png', resolution: 'high' },
        { type: 'image', data: 'BBBB', mime_type: 'image/jpeg', resolution: 'high' },
      ],
      generation_config: { max_output_tokens: 1175, temperature: 0.4, thinking_level: 'low' },
      store: false,
    });
    expect(result).toEqual({
      text: 'Two images.',
      usage: { inputTokens: 10, outputTokens: 25 },
      raw: interaction,
    });
  });

  it('omits an output cap and unset resolution for inline transcription batches', async () => {
    const { service, createSpy } = mockInteraction();

    await service.describeImages(createSettings({ taskType: 'transcription' }), 'Prompt', [
      'data:image/png;base64,AAAA',
    ]);

    expect(createSpy.mock.lastCall![0].generation_config).toEqual({ temperature: 0.4, thinking_level: 'low' });
    expect(createSpy.mock.lastCall![0].input[1]).toEqual({ type: 'image', data: 'AAAA', mime_type: 'image/png' });
  });

  it.each([
    { images: [], message: 'No images provided.' },
    { images: ['data:image/png;base64,AAAA', 'invalid'], message: 'Invalid image data URL at index 1.' },
  ])('validates all inline images before generating: $message', async ({ images, message }) => {
    const { service, createSpy } = mockInteraction();

    const result = await service.describeImages(createSettings(), 'Prompt', images);

    expect(result.error).toEqual({ code: 400, message });
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('uses a text-only Interaction with only the selected thinking level', async () => {
    const { service, createSpy, interaction } = mockInteraction({
      output_text: 'Translated text.',
      usage: { total_input_tokens: 3, total_output_tokens: 4, total_thought_tokens: 2 },
    });

    const result = await service.responsesTextTask(createSettings(), 'Translate this text.');

    expect(createSpy).toHaveBeenCalledWith({
      model: createSettings().model.id,
      input: 'Translate this text.',
      generation_config: { thinking_level: 'low' },
      store: false,
    });
    expect(result).toEqual({
      text: 'Translated text.',
      usage: { inputTokens: 3, outputTokens: 6 },
      raw: interaction,
    });
  });

  it.each(['high', undefined] as const)('resolves the text task model thinking default: %s', async thinkingLevel => {
    const { service, createSpy } = mockInteraction();

    await service.responsesTextTask(createSettings({
      thinkingLevel: null,
      model: { ...createSettings().model, parameters: { thinkingLevel } },
    }), 'Prompt');

    expect(createSpy.mock.lastCall![0].generation_config).toEqual(thinkingLevel ? { thinking_level: thinkingLevel } : {});
  });

  const migratedMethods = ['describeImages', 'describeImagesWithFilesApi', 'responsesTextTask'] as const;

  it.each(migratedMethods)('requires an API key for %s', async method => {
    const service = new GoogleService();
    const result = await service[method](createSettings(), 'Prompt', []);

    expect(result.error).toEqual({ code: 401, message: 'Google API key not set.' });
  });

  it.each(migratedMethods)('requires a prompt for %s', async method => {
    const { service, createSpy, files } = mockInteraction();
    const result = await service[method](createSettings(), '', []);

    expect(result.error).toEqual({ code: 400, message: 'Missing prompt.' });
    expect(createSpy).not.toHaveBeenCalled();
    expect(files.upload).not.toHaveBeenCalled();
  });

  it.each(migratedMethods)('maps Interactions HTTP errors for %s', async method => {
    const { service, createSpy, files } = mockInteraction();
    files.upload.mockResolvedValue({ name: 'files/1', uri: 'https://example.com/1', mimeType: 'image/png' });
    const error = Object.assign(new Error('429 {"error":{"message":"Rate limit exceeded."}}'), { status: 429 });
    createSpy.mockRejectedValue(error);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const result = method === 'describeImages'
        ? await service.describeImages(createSettings(), 'Prompt', ['data:image/png;base64,AAAA'])
        : method === 'describeImagesWithFilesApi'
        ? await service.describeImagesWithFilesApi(createSettings(), 'Prompt', [createImage()])
        : await service.responsesTextTask(createSettings(), 'Prompt');

      expect(result.error).toEqual({ code: 429, message: 'Rate limit exceeded.' });
      expect(result.raw).toBe(error);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  describe('Files API interactions', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.clearAllTimers();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('uploads images and sends text before their URIs with per-image resolution', async () => {
      const { service, createSpy, files, interaction } = mockInteraction({
        output_text: 'Transcribed pages.',
        usage: { total_input_tokens: 10, total_output_tokens: 20, total_thought_tokens: 5 },
      });
      files.upload
        .mockResolvedValueOnce({ name: 'files/1', uri: 'https://example.com/1', mimeType: 'image/png' })
        .mockResolvedValueOnce({ name: 'files/2', uri: 'https://example.com/2', mimeType: 'image/jpeg' });
      const images = [createImage(), createImage({
        id: 2, uploadKey: 'upload-2', base64Image: 'data:image/jpeg;base64,BBBB',
      })];
      const settings = createSettings({
        taskType: 'transcriptionBatchTei',
        model: { ...createSettings().model, parameters: { mediaResolution: 'high' } },
      });

      const result = await service.describeImagesWithFilesApi(settings, 'Transcribe these pages.', images);

      expect(files.upload).toHaveBeenCalledTimes(2);
      expect(files.upload).toHaveBeenNthCalledWith(2, {
        file: expect.any(Blob), config: { mimeType: 'image/jpeg' },
      });
      expect(createSpy).toHaveBeenCalledWith({
        model: settings.model.id,
        input: [
          { type: 'text', text: 'Transcribe these pages.' },
          { type: 'image', uri: 'https://example.com/1', mime_type: 'image/png', resolution: 'high' },
          { type: 'image', uri: 'https://example.com/2', mime_type: 'image/jpeg', resolution: 'high' },
        ],
        generation_config: { temperature: 0.4, thinking_level: 'low' },
        store: false,
      });
      expect(images[0]).toMatchObject({
        filesApiProvider: 'Google', filesApiId: 'files/1', filesApiUri: 'https://example.com/1', mimeType: 'image/png',
      });
      expect(result).toEqual({
        text: 'Transcribed pages.',
        usage: { inputTokens: 10, outputTokens: 25 },
        raw: interaction,
      });
    });

    it('reuses cached uploads and sends refreshed URI and MIME type metadata', async () => {
      const { service, createSpy, files } = mockInteraction();
      const image = createImage({
        filesApiProvider: 'Google', filesApiId: 'files/cached',
        filesApiUri: 'https://example.com/cached', mimeType: 'image/png',
      });
      files.get.mockResolvedValue({ name: 'files/cached', uri: 'https://example.com/refreshed', mimeType: 'image/jpeg' });

      await service.describeImagesWithFilesApi(createSettings(), 'Prompt', [image]);

      expect(files.get).toHaveBeenCalledWith({ name: 'files/cached' });
      expect(files.upload).not.toHaveBeenCalled();
      expect(createSpy.mock.lastCall![0].input).toEqual([
        { type: 'text', text: 'Prompt' },
        { type: 'image', uri: 'https://example.com/refreshed', mime_type: 'image/jpeg' },
      ]);
      expect(image.filesApiUri).toBe('https://example.com/refreshed');
    });

    it('rejects an empty image list before uploading or generating', async () => {
      const { service, createSpy, files } = mockInteraction();

      const result = await service.describeImagesWithFilesApi(createSettings(), 'Prompt', []);

      expect(result.error).toEqual({ code: 400, message: 'No images provided.' });
      expect(files.upload).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('stops before upload if the request is already cancelled', async () => {
      const { service, createSpy, files } = mockInteraction();
      const controller = new AbortController();
      controller.abort();

      const result = await service.describeImagesWithFilesApi(createSettings(), 'Prompt', [createImage()], {
        signal: controller.signal,
      });

      expect(result.error).toEqual({ code: 499, message: 'Request cancelled.' });
      expect(files.upload).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it('returns promptly when cancelled during generation and keeps the uploaded file available for cleanup', async () => {
      const { service, createSpy, files } = mockInteraction();
      files.upload.mockResolvedValue({ name: 'files/1', uri: 'https://example.com/1', mimeType: 'image/png' });
      const generationStarted = deferred<void>();
      const generation = deferred<Interactions.Interaction>();
      createSpy.mockImplementation(() => {
        generationStarted.resolve();
        return generation.promise;
      });
      const controller = new AbortController();
      const image = createImage();
      const request = service.describeImagesWithFilesApi(createSettings(), 'Prompt', [image], {
        signal: controller.signal,
      });
      await generationStarted.promise;

      controller.abort();
      const result = await request;

      expect(result.error).toEqual({ code: 499, message: 'Request cancelled.' });
      expect(image.filesApiId).toBe('files/1');
      await service.deleteUploadedFile(image);
      expect(files.delete).toHaveBeenCalledWith({ name: 'files/1' });
      expect(image.filesApiId).toBeUndefined();
      generation.resolve({ id: 'late-result', status: 'completed', output_text: 'Late text' });
    });

    it('keeps a cancelled in-flight upload discoverable for cleanup without starting generation', async () => {
      const { service, createSpy, files } = mockInteraction();
      const uploadStarted = deferred<void>();
      const upload = deferred<{ name: string; uri: string; mimeType: string }>();
      files.upload.mockImplementation(() => {
        uploadStarted.resolve();
        return upload.promise;
      });
      const controller = new AbortController();
      const image = createImage();
      const request = service.describeImagesWithFilesApi(createSettings(), 'Prompt', [
        image, createImage({ id: 2, uploadKey: 'upload-2' }),
      ], { signal: controller.signal });
      await uploadStarted.promise;

      controller.abort();
      const result = await request;
      const cleanup = service.deleteUploadedFile(image);
      upload.resolve({ name: 'files/late', uri: 'https://example.com/late', mimeType: 'image/png' });
      await cleanup;

      expect(result.error).toEqual({ code: 499, message: 'Request cancelled.' });
      expect(files.upload).toHaveBeenCalledTimes(1);
      expect(createSpy).not.toHaveBeenCalled();
      expect(files.delete).toHaveBeenCalledWith({ name: 'files/late' });
      expect(image.filesApiId).toBeUndefined();
    });

    it('does not generate if an image upload fails', async () => {
      const { service, createSpy, files } = mockInteraction();
      files.upload.mockRejectedValue(new Error('Upload failed.'));
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await service.describeImagesWithFilesApi(createSettings(), 'Prompt', [createImage()]);

      expect(result.error).toEqual({ code: 400, message: 'Failed to upload image at index 0.' });
      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});
