export type PromptOption = {
  type: 'Alt text' | 'Transcription';
  prompt: string;
  modelRestrictions?: string[];
};

export type Prompt = {
  languageCode: string;
  languageDisplayName: string;
  filenamePrompt: string;
  promptOptions: PromptOption[];
  translatePrompt: string;
};

export type Prompts = Prompt[];

export interface PromptNounObj {
  singular: string;
  plural: string;
}

export const promptOptionNouns: Record<
  Extract<PromptOption['type'], 'Alt text' | 'Transcription'>,
  PromptNounObj
> = {
  'Alt text': {
    singular: 'alt text',
    plural: 'alt texts'
  },
  'Transcription': {
    singular: 'transcription',
    plural: 'transcriptions'
  }
}
