export type PromptOption = {
  type: 'Alt text' | 'Transcription' | 'ISAD(G) metadata';
  prompt: string;
};

export type Prompt = {
  languageCode: string;
  languageDisplayName: string;
  filenamePrompt: string;
  promptOptions: PromptOption[];
  translatePrompt: string;
};

export type Prompts = Prompt[];
