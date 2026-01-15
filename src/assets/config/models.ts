import { Model } from '../../app/types/model.types'
import { TaskTypeId } from './prompts';

export type ModelProvider = 'OpenAI' | 'Google';
export type ModelId = 'gpt-4.1-mini' | 'gpt-4.1' | 'gpt-5.2' | 'gemini-3-pro-preview';

// provider = name of model creator
// name = display name of the model
// id = the API id or name of the model
// inputPrice = Either a flat price ($/1M tokens in prompt) or a tiered
//              price depending on token count.
// outputPrice = Either a flat price ($/1M tokens in model output) or a
//               tiered price depending on token count.
// rpm = max requests per minute the model accepts at current usage tier
// supportedTaskTypes = array of task types the model can be used for
// parameters = an object with model parameters:
//     maxImageShortsidePx = (optional) max supported image short side
//                           length in pixels, set to null for no limit,
//                           defaults to 768 if undefined
//     reasoningEffort = (optional, required for reasoning models)
//                       reasoning effort constraint for reasoning
//                       models, supported values are `none`, `minimal`,
//                       `low`, `medium` and `high` depending on the model

// OpenAI Responses API reference: https://platform.openai.com/docs/api-reference/responses/create

export const MODELS: Model[] = [
  {
    provider: 'OpenAI',
    name: 'GPT-4.1',
    id: 'gpt-4.1',
    inputPrice: 2.0,
    outputPrice: 8.0,
    rpm: 5000,
    supportedTaskTypes: ['altText', 'transcription']
  },
  {
    provider: 'OpenAI',
    name: 'GPT-4.1 mini',
    id: 'gpt-4.1-mini',
    inputPrice: 0.4,
    outputPrice: 1.6,
    rpm: 5000,
    supportedTaskTypes: ['altText']
  },
  {
    provider: 'OpenAI',
    name: 'GPT-5.2',
    id: 'gpt-5.2',
    inputPrice: 1.75,
    outputPrice: 14.0,
    rpm: 5000,
    supportedTaskTypes: ['altText', 'transcription'],
    parameters: {
      reasoningEffort: 'none'
    }
  },
  {
    provider: 'Google',
    name: 'Gemini 3 Pro',
    id: 'gemini-3-pro-preview',
    inputPrice: { tiers: [{ upToTokens: 200000, per1M: 2.00 }, { upToTokens: null, per1M: 4.00 }] },
    outputPrice: { tiers: [{ upToTokens: 200000, per1M: 12.00 }, { upToTokens: null, per1M: 18.00 }] },
    rpm: 5000,
    supportedTaskTypes: ['altText', 'transcription'],
    parameters: {
      thinkingLevel: 'low',
      maxImageShortsidePx: null
    }
  }
];

export function getModelsForTaskType(taskType: TaskTypeId): Model[] {
  return MODELS.filter(m => m.supportedTaskTypes.includes(taskType));
}

export function isModelAllowedForTaskType(modelId: ModelId, taskType: TaskTypeId): boolean {
  return MODELS.some(m => m.id === modelId && m.supportedTaskTypes.includes(taskType));
}
