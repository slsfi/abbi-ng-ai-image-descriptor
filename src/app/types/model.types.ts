// provider = name of model creator
// name = display name of the model
// id = the API id or name of the model
// inputPrice = $/1M tokens in prompt
// outputPrice = $/1M tokens in model output
// rpm = max requests per minute the model accepts at current usage tier
// default = (optional) boolean indicating which model is the default
// parameters = an object with model parameters:
//     maxImageShortsidePx = (optional) max supported image short side
//                           length in pixels, set to null for no limit,
//                           defaults to 768 if undefined
//     reasoningEffort = (optional, required for reasoning models)
//                        reasoning effort constraint for reasoning
//                        models, supported values are `none`, `minimal`,
//                        `low`, `medium` and `high` depending on the model

export interface Model {
  provider: 'OpenAI';
  name: string;
  id: string;
  inputPrice: number;
  outputPrice: number;
  rpm: number;
  default?: boolean;
  parameters?: ModelParameters;
};

export type Models = Model[];

export interface ModelParameters {
  maxImageShortsidePx?: number | null;
  reasoningEffort?: string;
}
