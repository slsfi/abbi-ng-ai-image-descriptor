import { GoogleService } from './google.service';
import { RequestSettings } from '../types/settings.types';

function createSettings(overrides: Partial<RequestSettings> = {}): RequestSettings {
  return {
    model: {
      provider: 'Google',
      name: 'Test model',
      id: 'gemini-3-flash-preview',
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
    batchSize: 10,
    ...overrides,
  };
}

describe('GoogleService', () => {
  it('keeps temperature in the payload when the model does not opt out', async () => {
    const service = new GoogleService();
    const generateSpy = jasmine.createSpy().and.resolveTo({
      text: 'ok',
      usageMetadata: {
        promptTokenCount: 1,
        candidatesTokenCount: 1,
        thoughtsTokenCount: 0,
      },
    });

    (service as any).client = {
      models: {
        generateContent: generateSpy,
      },
    };

    await service.describeImage(createSettings(), 'Prompt', 'data:image/png;base64,AAAA');

    const payload = generateSpy.calls.mostRecent().args[0];
    expect(payload.config.temperature).toBe(0.4);
  });

  it('omits temperature when the model opts out and thinking is enabled', async () => {
    const service = new GoogleService();
    const generateSpy = jasmine.createSpy().and.resolveTo({
      text: 'ok',
      usageMetadata: {
        promptTokenCount: 1,
        candidatesTokenCount: 1,
        thoughtsTokenCount: 0,
      },
    });

    (service as any).client = {
      models: {
        generateContent: generateSpy,
      },
    };

    await service.describeImage(createSettings({
      model: {
        ...createSettings().model,
        parameters: {
          reasoningSupportsTemperature: false,
        },
      },
    }), 'Prompt', 'data:image/png;base64,AAAA');

    const payload = generateSpy.calls.mostRecent().args[0];
    expect('temperature' in payload.config).toBeFalse();
  });
});
