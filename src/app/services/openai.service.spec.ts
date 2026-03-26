import { OpenAiService } from './openai.service';
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
    };

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
    };

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
    };

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
});
