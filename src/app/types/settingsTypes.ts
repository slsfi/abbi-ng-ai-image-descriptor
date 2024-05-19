import { Model } from "./modelTypes";

export type RequestSettings = {
  model: Model | null;
  temperature: number;
  language: string;
  maxLength: number;
  promptTemplate: string
};
