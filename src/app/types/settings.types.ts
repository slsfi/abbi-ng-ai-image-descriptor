import { Model } from "./model.types";

export type RequestSettings = {
  model: Model | null;
  temperature: number;
  language: string;
  maxLength: number;
  promptTemplate: string;
  includeFilename: boolean;
};
