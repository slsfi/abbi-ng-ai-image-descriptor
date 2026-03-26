import { RequestSettings } from '../types/settings.types';
import { isTemperatureSupportedForModel } from './model-parameters';

function createSettings(overrides: Partial<RequestSettings> = {}): RequestSettings {
  return {
    model: {
      provider: 'OpenAI',
      name: 'Test model',
      id: 'gpt-4.1',
      inputPrice: 0,
      outputPrice: 0,
      rpm: 1,
      supportedTaskTypes: ['altText'],
      url: 'https://example.com',
    },
    taskType: 'altText',
    temperature: 1,
    reasoningEffort: null,
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

describe('isTemperatureSupportedForModel', () => {
  it('defaults to supported when the flag is omitted', () => {
    const settings = createSettings({
      model: {
        ...createSettings().model,
        id: 'gpt-5.2',
        parameters: {
          reasoningEffort: 'none',
          reasoningEfforts: ['none', 'low'],
        },
      },
      reasoningEffort: 'low',
    });

    expect(
      isTemperatureSupportedForModel(settings.model, settings.reasoningEffort, settings.thinkingLevel)
    ).toBeTrue();
  });

  it('requires OpenAI reasoning effort none when the flag is false', () => {
    const settings = createSettings({
      model: {
        ...createSettings().model,
        id: 'gpt-5.2',
        parameters: {
          reasoningSupportsTemperature: false,
          reasoningEffort: 'none',
          reasoningEfforts: ['none', 'low'],
        },
      },
      reasoningEffort: 'low',
    });

    expect(
      isTemperatureSupportedForModel(settings.model, settings.reasoningEffort, settings.thinkingLevel)
    ).toBeFalse();
    expect(
      isTemperatureSupportedForModel(settings.model, 'none', settings.thinkingLevel)
    ).toBeTrue();
  });

  it('requires Google thinking level to be undefined when the flag is false', () => {
    const settings = createSettings({
      model: {
        ...createSettings().model,
        provider: 'Google',
        id: 'gemini-3-flash-preview',
        parameters: {
          reasoningSupportsTemperature: false,
          thinkingLevel: 'low',
          thinkingLevels: ['low', 'medium'],
        },
      },
      reasoningEffort: null,
      thinkingLevel: 'low',
    });

    expect(
      isTemperatureSupportedForModel(settings.model, settings.reasoningEffort, settings.thinkingLevel)
    ).toBeFalse();
    expect(
      isTemperatureSupportedForModel(settings.model, settings.reasoningEffort, null)
    ).toBeFalse();
    expect(
      isTemperatureSupportedForModel(
        {
          ...settings.model,
          parameters: {
            ...settings.model.parameters,
            thinkingLevel: undefined,
          },
        },
        settings.reasoningEffort,
        null
      )
    ).toBeTrue();
  });
});
