export type DescriptionData = {
  description: string;
  language: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  error?: string;
}
