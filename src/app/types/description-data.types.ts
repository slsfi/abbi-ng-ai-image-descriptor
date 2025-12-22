import { LanguageCode } from "../../assets/config/prompts";

export type DescriptionData = {
  description: string;
  language?: LanguageCode;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  error?: string;
}
