import { GeminiThinkingLevel, Model, OpenAiReasoningEffort } from '../types/model.types';

export function isTemperatureSupportedForModel(
  model: Model,
  reasoningEffort?: OpenAiReasoningEffort | null,
  thinkingLevel?: GeminiThinkingLevel | null
): boolean {
  if (model.parameters?.reasoningSupportsTemperature ?? true) {
    return true;
  }

  if (model.provider === 'OpenAI') {
    const effectiveReasoningEffort = reasoningEffort ?? model.parameters?.reasoningEffort ?? null;
    return !effectiveReasoningEffort || effectiveReasoningEffort === 'none';
  }

  if (model.provider === 'Google') {
    const effectiveThinkingLevel = thinkingLevel ?? model.parameters?.thinkingLevel ?? null;
    return !effectiveThinkingLevel;
  }

  return true;
}
