import { Model } from "./model.types";
import { PromptVariant } from "./prompt.types";
import { LanguageCode, TaskTypeId } from "../../assets/config/prompts";

export interface RequestSettings {
  model: Model;
  language?: LanguageCode;
  taskType: TaskTypeId;
  temperature: number | null;
  descriptionLength: number;
  promptVariant: PromptVariant;
  includeFilename: boolean;
};
