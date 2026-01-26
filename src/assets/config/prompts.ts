import { TaskTypeConfig } from "../../app/types/prompt.types"

import altTextSwedishPrompt from '../prompts/altTextMainSwedish.txt?raw';
import altTextFinnishPrompt from '../prompts/altTextMainFinnish.txt?raw';
import altTextEnglishPrompt from '../prompts/altTextMainEnglish.txt?raw';
import altTextFilenameSwedishPrompt from '../prompts/altTextFilenameSwedish.txt?raw';
import altTextFilenameFinnishPrompt from '../prompts/altTextFilenameFinnish.txt?raw';
import altTextFilenameEnglishPrompt from '../prompts/altTextFilenameEnglish.txt?raw';
import altTextTranslateSwedishPrompt from '../prompts/altTextTranslateSwedish.txt?raw';
import altTextTranslateFinnishPrompt from '../prompts/altTextTranslateFinnish.txt?raw';
import altTextTranslateEnglishPrompt from '../prompts/altTextTranslateEnglish.txt?raw';
import transcriptionIncludeHeadersPrompt from '../prompts/transcriptionIncludeHeaders.txt?raw';
import transcriptionIgnoreHeadersPrompt from '../prompts/transcriptionIgnoreHeaders.txt?raw';
import transcriptionTeiPrompt from '../prompts/transcriptionTei.txt?raw';
import transcriptionBatchTeiPrompt from '../prompts/transcriptionBatchTei.txt?raw';

/*
console.log(
  '[DEBUG] transcriptionBatchTeiPrompt loaded:',
  transcriptionBatchTeiPrompt.slice(0, 2000)
);
*/

export type TaskTypeId = 'altText' | 'transcription' | 'transcriptionBatchTei';
export type LanguageCode = 'sv' | 'fi' | 'en';

export const TASK_CONFIGS: TaskTypeConfig[] = [
  {
    taskType: 'altText',
    label: 'Generate alt texts',
    taskDescription: 'Generate concise, accessible alt text descriptions for images, processing each image individually.',
    nouns: {
      singular: 'alt text',
      plural: 'alt texts'
    },
    defaultModel: 'gpt-4.1',
    variants: [
      {
        id: 'sv',
        label: 'Swedish',
        languageCode: 'sv',
        prompt: altTextSwedishPrompt
      },
      {
        id: 'fi',
        label: 'Finnish',
        languageCode: 'fi',
        prompt: altTextFinnishPrompt
      },
      {
        id: 'en',
        label: 'English',
        languageCode: 'en',
        prompt: altTextEnglishPrompt
      },
    ],
    helpers: {
      filenamePrompt: {
        sv: altTextFilenameSwedishPrompt,
        fi: altTextFilenameFinnishPrompt,
        en: altTextFilenameEnglishPrompt
      },
      translatePrompt: {
        sv: altTextTranslateSwedishPrompt,
        fi: altTextTranslateFinnishPrompt,
        en: altTextTranslateEnglishPrompt
      },
    },
  },
  {
    taskType: 'transcription',
    label: 'Transcribe',
    taskDescription: 'Transcribe text from images one by one and optionally encode each transcription as TEI XML in a separate step.',
    nouns: {
      singular: 'transcription',
      plural: 'transcriptions'
    },
    defaultModel: 'gemini-3-pro-preview',
    variants: [
      {
        id: 'default',
        label: 'Include headers/footers',
        prompt: transcriptionIncludeHeadersPrompt
      },
      { id: 'noHeaders',
        label: 'Ignore headers/footers/page numbers',
        prompt: transcriptionIgnoreHeadersPrompt
      },
    ],
    helpers: {
      teiEncodePrompt: transcriptionTeiPrompt
    }
  },
  {
    taskType: 'transcriptionBatchTei',
    label: 'Transcribe + TEI encode (batched)',
    taskDescription: 'Transcribe text from multiple images in batches and encode the results as TEI XML in a single combined step.',
    nouns: {
      singular: 'TEI transcription (batched)',
      plural: 'TEI transcriptions (batched)'
    },
    defaultModel: 'gemini-3-pro-preview',
    variants: [
      {
        id: 'default',
        label: 'TEI body (batched, no running headers)',
        prompt: transcriptionBatchTeiPrompt
      }
    ]
  }
] as const;

// Map of task types for lookups
export const TASK_TYPES_BY_ID = Object.fromEntries(
  TASK_CONFIGS.map(t => [t.taskType, t])
) as Record<TaskTypeId, TaskTypeConfig>;
