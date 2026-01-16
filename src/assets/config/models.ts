import { Model } from '../../app/types/model.types'
import { TaskTypeId } from './prompts';

export type ModelProvider = 'OpenAI' | 'Google';
export type ModelId = 'gpt-4.1-mini' | 'gpt-4.1' | 'gpt-5.2' | 'gemini-3-flash-preview' | 'gemini-3-pro-preview';

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
// Google GenAI SDK for TypeScript and JavaScript: https://googleapis.github.io/js-genai/release_docs/index.html

export const MODELS: Model[] = [
  {
    provider: 'OpenAI',
    name: 'GPT-4.1',
    id: 'gpt-4.1',
    description: 'A high-quality model for generating clear, accurate, and well-structured alt text, especially suited for detailed image descriptions.',
    inputPrice: 2.0,
    outputPrice: 8.0,
    rpm: 5000,
    supportedTaskTypes: ['altText', 'transcription'],
    url: 'https://platform.openai.com/docs/models/gpt-4.1'
  },
  {
    provider: 'OpenAI',
    name: 'GPT-4.1 mini',
    id: 'gpt-4.1-mini',
    description: 'A lightweight and inexpensive model for generating alt text quickly at scale when absolute precision is not critical.',
    inputPrice: 0.4,
    outputPrice: 1.6,
    rpm: 5000,
    supportedTaskTypes: ['altText'],
    url: 'https://platform.openai.com/docs/models/gpt-4.1-mini'
  },
  {
    provider: 'OpenAI',
    name: 'GPT-5.2',
    id: 'gpt-5.2',
    description: 'A powerful model optimized for high-quality outputs, well suited for complex images.',
    inputPrice: 1.75,
    outputPrice: 14.0,
    rpm: 5000,
    supportedTaskTypes: ['altText', 'transcription'],
    url: 'https://platform.openai.com/docs/models/gpt-5.2',
    parameters: {
      reasoningEffort: 'none'
    }
  },
  {
    provider: 'Google',
    name: 'Gemini 3 Pro Preview',
    id: 'gemini-3-pro-preview',
    description: 'The most accurate model for transcription tasks, excelling at handwritten text, and the best choice when transcription quality is critical.',
    inputPrice: { tiers: [{ upToTokens: 200000, per1M: 2.00 }, { upToTokens: null, per1M: 4.00 }] },
    outputPrice: { tiers: [{ upToTokens: 200000, per1M: 12.00 }, { upToTokens: null, per1M: 18.00 }] },
    rpm: 25,
    supportedTaskTypes: ['altText', 'transcription'],
    url: 'https://ai.google.dev/gemini-api/docs/models#gemini-3-pro',
    parameters: {
      thinkingLevel: 'low',
      maxImageShortsidePx: null
    }
  },
  {
    provider: 'Google',
    name: 'Gemini 3 Flash Preview',
    id: 'gemini-3-flash-preview',
    description: 'A fast and cost-efficient alternative to Gemini 3 Pro that delivers near-pro transcription quality, including handwritten text, with much higher throughput.',
    inputPrice: 0.5,
    outputPrice: 3.0,
    rpm: 1000,
    supportedTaskTypes: ['altText', 'transcription'],
    url: 'https://ai.google.dev/gemini-api/docs/models#gemini-3-flash',
    parameters: {
      thinkingLevel: 'minimal',
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
