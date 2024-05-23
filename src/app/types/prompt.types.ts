export type PromptOption = {
  type: string;
  prompt: string;
};

export type Prompt = {
  languageCode: string;
  languageDisplayName: string;
  filenamePrompt: string;
  promptOptions: PromptOption[];
};

export type Prompts = Prompt[];
