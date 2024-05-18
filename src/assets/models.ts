import { Models } from '../app/types/modelTypes'

export const models: Models = [
  {
    provider: "OpenAI",
    name: "GPT-4o",
    id: "gpt-4o",
    inputPrice: 5.0,
    outputPrice: 15.0,
    rpm: 5000,
    default: true
  },
  {
    provider: "OpenAI",
    name: "GPT-4-turbo (legacy)",
    id: "gpt-4-turbo",
    inputPrice: 10.0,
    outputPrice: 30.0,
    rpm: 500
  }
]
