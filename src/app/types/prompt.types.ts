import { ModelId } from "../../assets/config/models";
import { LanguageCode, TaskTypeId } from "../../assets/config/prompts";

export type PromptVariant = {
  id: string;
  label: string;
  prompt: string;
  languageCode?: LanguageCode;
};

export type TaskNouns = {
  singular: string;
  plural: string;
}

export type TaskTypeConfig = {
  taskType: TaskTypeId;
  label: string;
  taskDescription?: string;
  nouns: TaskNouns;
  defaultModel: ModelId;
  variants: PromptVariant[];
  helpers?: {
    filenamePrompt?: Record<LanguageCode, string>;
    translatePrompt?: Record<LanguageCode, string>;
    teiEncodePrompt?: string;
  };
};
