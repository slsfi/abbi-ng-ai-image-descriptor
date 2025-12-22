import { TaskTypeId } from "../../assets/config/prompts";
import { ModelId, ModelProvider } from "../../assets/config/models";

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
//                        reasoning effort constraint for reasoning
//                        models, supported values are `none`, `minimal`,
//                        `low`, `medium` and `high` depending on the model

export interface Model {
  provider: ModelProvider;
  name: string;
  id: ModelId;
  inputPrice: PricePerMTokens;
  outputPrice: PricePerMTokens;
  rpm: number;
  supportedTaskTypes: TaskTypeId[];
  parameters?: ModelParameters;
};

export type Models = Model[];

export interface ModelParameters {
  maxImageShortsidePx?: number | null;
  reasoningEffort?: string;
}

// A fixed price in USD per one million tokens, independent of token count.
export type FlatPricePerMTokens = number;

// A token-count–dependent pricing scheme expressed as ordered tiers.
// Each tier defines a price per one million tokens up to a given token limit;
// the final tier (upToTokens: null) applies to all higher token counts.
// There must be at least one tier – the `upToTokens: null` – tier, and the
// tiers must be ordered according to the `upToTokens` value. The "null-tier"
// must be the last tier.
export type TieredPricePerMTokens = {
  tiers: readonly [
    ...Array<{ upToTokens: number; per1M: number }>,
    { upToTokens: null; per1M: number }
  ];
};

// A model price definition that can be either a flat rate or a tiered,
// token-dependent rate.
export type PricePerMTokens = FlatPricePerMTokens | TieredPricePerMTokens;

/**
 * Resolves the effective price per one million tokens for a given token
 * count, handling both flat and tiered pricing models.
 */
export function resolvePerMTokensPrice(price: PricePerMTokens, tokens: number): number {
  if (typeof price === 'number') return price;

  const tier = price.tiers.find(t => t.upToTokens === null || tokens <= t.upToTokens);
  if (!tier) {
    throw new Error('Invalid tier configuration (no matching tier)');
  }
  return tier.per1M;
}
