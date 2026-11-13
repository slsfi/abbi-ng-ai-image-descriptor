import { LanguageCode } from "../../assets/config/prompts";

export type DescriptionData = {
  description: string;
  language?: LanguageCode;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  teiEncoded?: boolean;
  // Retain the generation-time choice for exports; older results default to true.
  normaliseCharacters?: boolean;
  error?: string;
}
