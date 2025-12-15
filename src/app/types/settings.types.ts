import { Model } from "./model.types";

export type RequestSettings = {
  model?: Model;
  temperature: number;
  language: string;
  descriptionLength: number;
  promptTemplate: string;
  includeFilename: boolean;
  transcribeHeaders: boolean;
};
