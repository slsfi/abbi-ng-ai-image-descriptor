export type PromptOption = {
  type: 'Alt text' | 'ISAD(G) metadata';
  prompt: string;
};

export type Prompt = {
  languageCode: string;
  languageDisplayName: string;
  filenamePrompt: string;
  promptOptions: PromptOption[];
};

export type Prompts = Prompt[];
