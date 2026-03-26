import { OpenAiService } from './openai.service';
import { ImageData } from '../types/image-data.types';
import { RequestSettings } from '../types/settings.types';

function createSettings(overrides: Partial<RequestSettings> = {}): RequestSettings {
  return {
    model: {
      provider: 'OpenAI',
      name: 'Test model',
      id: 'gpt-5.4',
      inputPrice: 0,
      outputPrice: 0,
      rpm: 1,
      supportedTaskTypes: ['altText'],
      url: 'https://example.com',
      parameters: {
        imageDetail: 'high',
        reasoningEffort: 'none',
        reasoningEfforts: ['none', 'low'],
      },
    },
    taskType: 'altText',
    temperature: 0.7,
    reasoningEffort: 'low',
    thinkingLevel: null,
    descriptionLength: 175,
    promptVariant: {
      id: 'default',
      label: 'Default',
      prompt: 'Test prompt',
    },
    includeFilename: true,
    teiEncode: false,
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

describe('OpenAiService', () => {
  it('keeps temperature in the payload when the model does not opt out', async () => {
    const service = new OpenAiService();
    const createSpy = jasmine.createSpy().and.resolveTo({
      output_text: 'ok',
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    service.client = {
      responses: {
        create: createSpy,
      },
    } as any;

    await service.describeImage(createSettings(), 'Prompt', 'data:image/png;base64,AAAA');

    const payload = createSpy.calls.mostRecent().args[0];
    expect(payload.temperature).toBe(0.7);
  });

  it('omits temperature when the model opts out and reasoning is enabled', async () => {
    const service = new OpenAiService();
    const createSpy = jasmine.createSpy().and.resolveTo({
      output_text: 'ok',
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    service.client = {
      responses: {
        create: createSpy,
      },
    } as any;

    await service.describeImage(createSettings({
      model: {
        ...createSettings().model,
        parameters: {
          imageDetail: 'high',
          reasoningSupportsTemperature: false,
          reasoningEffort: 'none',
          reasoningEfforts: ['none', 'low'],
        },
      },
    }), 'Prompt', 'data:image/png;base64,AAAA');

    const payload = createSpy.calls.mostRecent().args[0];
    expect('temperature' in payload).toBeFalse();
  });

  it('uses image detail from the model parameters', async () => {
    const service = new OpenAiService();
    const createSpy = jasmine.createSpy().and.resolveTo({
      output_text: 'ok',
      usage: { input_tokens: 1, output_tokens: 1 },
    });

    service.client = {
      responses: {
        create: createSpy,
      },
    } as any;

    await service.describeImage(createSettings({
      model: {
        ...createSettings().model,
        parameters: {
          ...createSettings().model.parameters,
          imageDetail: 'low',
        },
      },
    }), 'Prompt', 'data:image/png;base64,AAAA');

    const payload = createSpy.calls.mostRecent().args[0];
    expect(payload.input[0].content[1].detail).toBe('low');
  });

  it('builds a multi-image payload for inline batch requests', async () => {
    const service = new OpenAiService();
    const createSpy = jasmine.createSpy().and.resolveTo({
      output_text: 'ok',
      usage: { input_tokens: 2, output_tokens: 1 },
    });

    service.client = {
      responses: {
        create: createSpy,
      },
    } as any;

    await service.describeImages(
      createSettings({ taskType: 'transcription' }),
      'Prompt',
      ['data:image/png;base64,AAAA', 'data:image/png;base64,BBBB']
    );

    const payload = createSpy.calls.mostRecent().args[0];
    expect(payload.input[0].content[0]).toEqual({
      type: 'input_text',
      text: 'Prompt',
    });
    expect(payload.input[0].content[1].type).toBe('input_image');
    expect(payload.input[0].content[1].image_url).toBe('data:image/png;base64,AAAA');
    expect(payload.input[0].content[2].image_url).toBe('data:image/png;base64,BBBB');
  });

  it('uploads OpenAI Files API images with a 48 hour expiry and sends file ids to the model', async () => {
    const service = new OpenAiService();
    const uploadSpy = jasmine.createSpy().and.resolveTo({ id: 'file-123' });
    const createSpy = jasmine.createSpy().and.resolveTo({
      output_text: 'ok',
      usage: { input_tokens: 2, output_tokens: 1 },
    });

    service.client = {
      files: {
        create: uploadSpy,
      },
      responses: {
        create: createSpy,
      },
    } as any;

    const image = createImage();
    await service.describeImagesWithFilesApi(
      createSettings({ taskType: 'transcriptionBatchTei' }),
      'Prompt',
      [image]
    );

    const uploadPayload = uploadSpy.calls.mostRecent().args[0];
    expect(uploadPayload.purpose).toBe('user_data');
    expect(uploadPayload.expires_after).toEqual({
      anchor: 'created_at',
      seconds: 48 * 60 * 60,
    });

    const responsePayload = createSpy.calls.mostRecent().args[0];
    expect(responsePayload.input[0].content[1]).toEqual({
      type: 'input_image',
      file_id: 'file-123',
      detail: 'high',
    });

    expect(image.filesApiProvider).toBe('OpenAI');
    expect(image.filesApiId).toBe('file-123');
    expect(image.filesApiUri).toBeUndefined();
    expect(image.mimeType).toBe('image/png');
  });

  it('reuses a cached OpenAI file upload when the file still exists', async () => {
    const service = new OpenAiService();
    const retrieveSpy = jasmine.createSpy().and.resolveTo({ id: 'file-existing' });
    const uploadSpy = jasmine.createSpy();
    const createSpy = jasmine.createSpy().and.resolveTo({
      output_text: 'ok',
      usage: { input_tokens: 2, output_tokens: 1 },
    });

    service.client = {
      files: {
        retrieve: retrieveSpy,
        create: uploadSpy,
      },
      responses: {
        create: createSpy,
      },
    } as any;

    const image = createImage({
      filesApiProvider: 'OpenAI',
      filesApiId: 'file-existing',
      mimeType: 'image/png',
    });

    await service.describeImagesWithFilesApi(
      createSettings({ taskType: 'transcriptionBatchTei' }),
      'Prompt',
      [image]
    );

    expect(retrieveSpy).toHaveBeenCalledWith('file-existing');
    expect(uploadSpy).not.toHaveBeenCalled();

    const responsePayload = createSpy.calls.mostRecent().args[0];
    expect(responsePayload.input[0].content[1].file_id).toBe('file-existing');
  });

  it('deletes a cached OpenAI upload and clears the image cache fields', async () => {
    const service = new OpenAiService();
    const deleteSpy = jasmine.createSpy().and.resolveTo({ deleted: true });

    service.client = {
      files: {
        delete: deleteSpy,
      },
    } as any;

    const image = createImage({
      filesApiProvider: 'OpenAI',
      filesApiId: 'file-delete',
      mimeType: 'image/png',
    });

    await service.deleteUploadedFile(image);

    expect(deleteSpy).toHaveBeenCalledWith('file-delete');
    expect(image.filesApiId).toBeUndefined();
    expect(image.filesApiProvider).toBeUndefined();
    expect(image.filesApiUri).toBeUndefined();
  });

  it('returns a cancelled result when an OpenAI Files API batch request is aborted', async () => {
    const service = new OpenAiService();
    const ctrl = new AbortController();

    service.client = {
      files: {
        create: jasmine.createSpy().and.resolveTo({ id: 'file-123' }),
      },
      responses: {
        create: jasmine.createSpy().and.returnValue(new Promise(() => {})),
      },
    } as any;

    const promise = service.describeImagesWithFilesApi(
      createSettings({ taskType: 'transcriptionBatchTei' }),
      'Prompt',
      [createImage()],
      { signal: ctrl.signal }
    );

    ctrl.abort();

    const result = await promise;
    expect(result.error).toEqual({ code: 499, message: 'Request cancelled.' });
  });
});
