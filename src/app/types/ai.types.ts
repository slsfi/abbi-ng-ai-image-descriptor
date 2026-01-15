export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type AiError = {
  code: number | string;
  message: string;
};

export type AiResult = {
  text: string;       // normalized model output text
  usage?: AiUsage;    // normalized usage (if provider returns it)
  error?: AiError;    // normalized error
  raw?: unknown;      // optional raw provider response (debugging)
};
