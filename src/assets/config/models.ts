import { Models } from '../../app/types/model.types'

// provider = name of model creator
// name = display name of the model
// id = the API id or name of the model
// inputPrice = $/1M tokens in prompt
// outputPrice = $/1M tokens in model output
// rpm = max requests per minute the model accepts at current usage tier
// reasoning = (optional, required for reasoning models) reasoning effort
//             constraint for reasoning models, supported values are
//             `none`, `minimal`, `low`, `medium` and `high` depending
//             on the model
// default = (optional) boolean indicating which model is the default

// OpenAI Responses API reference: https://platform.openai.com/docs/api-reference/responses/create

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
    name: "GPT-5.2",
    id: "gpt-5.2",
    inputPrice: 1.75,
    outputPrice: 14.0,
    rpm: 5000,
    reasoning: "none"
  }
]
