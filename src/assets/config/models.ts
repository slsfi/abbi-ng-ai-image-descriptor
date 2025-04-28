import { Models } from '../../app/types/model.types'

// provider = name of model creator
// name = display name of the model
// id = the API id or name of the model
// inputPrice = $/1M tokens in prompt
// outputPrice = $/1M tokens in model output
// rpm = max requests per minute the model accepts at current usage tier
// default = (optional) boolean indicating which model is the default
export const models: Models = [
  {
    provider: "OpenAI",
    name: "GPT-4.1",
    id: "gpt-4.1",
    inputPrice: 2.0,
    outputPrice: 8.0,
    rpm: 5000,
    default: true
  },
  {
    provider: "OpenAI",
    name: "GPT-4.1 mini",
    id: "gpt-4.1-mini",
    inputPrice: 0.4,
    outputPrice: 1.6,
    rpm: 5000
  },
  {
    provider: "OpenAI",
    name: "GPT-4o",
    id: "gpt-4o",
    inputPrice: 2.5,
    outputPrice: 10.0,
    rpm: 5000
  },
  {
    provider: "OpenAI",
    name: "GPT-4o mini",
    id: "gpt-4o-mini",
    inputPrice: 0.15,
    outputPrice: 0.6,
    rpm: 5000
  },
  {
    provider: "OpenAI",
    name: "GPT-4.5 preview",
    id: "gpt-4.5-preview",
    inputPrice: 75.0,
    outputPrice: 150.0,
    rpm: 5000
  }
]
