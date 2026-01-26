import { TaskTypeConfig } from "../../app/types/prompt.types"

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
        prompt: 'Generera en kort (ca {{DESC_LENGTH}} tecken lång) beskrivning av vad bilden föreställer. Beskrivningen ska vara så koncis som möjlig, men samtidigt så detaljerad som bilden kräver. Beskrivningen kommer att användas som alternativ text (”alt-text”): text som är associerad med en bild och som tjänar samma syfte och förmedlar samma väsentliga information som bilden.\n\nInstruktioner:\n\n1) Svara endast med själva beskrivningen av bilden, utan förklaringar eller konversation.\n2) Börja inte med "Bilden föreställer" eller någon dylik fras, utan med vilken typ av bild det är, t.ex. ett foto, ett svartvitt foto, en målning, en ritning, en gravyr o.s.v.\n3) De viktiga detaljerna borde framgå i början av beskrivningen.\n4) Ignorera tavlors ramar.'
      },
      {
        id: 'fi',
        label: 'Finnish',
        languageCode: 'fi',
        prompt: 'Luo lyhyt (noin {{DESC_LENGTH}} merkkiä pitkä) kuvaus siitä, mitä kuva esittää. Kuvauksen tulee olla mahdollisimman ytimekäs, mutta silti kuvan vaatimalla tavalla yksityiskohtainen. Kuvausta käytetään vaihtoehtoisena tekstinä (tunnetaan myös nimellä alt-teksti): tekstinä, joka liittyy kuvaan ja joka palvelee samaa tarkoitusta ja välittää saman olennaisen tiedon kuin kuva.\n\nOhjeet:\n\n1) Vastaa vain varsinaisella kuvauksella, ilman perusteluja tai keskustelua.\n2) Älä aloita ”Kuva esittää” tai vastaavalla ilmauksella, vaan millainen kuva on kyseessä, esimerkiksi valokuva, mustavalkoinen valokuva, maalaus, piirros, etsaus jne.\n3) Tärkeät yksityiskohdat tulisi mainita heti ensimmäisissä sanoissa.\n4) Jos kuva esittää kehystettyä taulua, jätä kehys huomiotta.'
      },
      {
        id: 'en',
        label: 'English',
        languageCode: 'en',
        prompt: 'Generate a short (about {{DESC_LENGTH}} characters long) description of what the image depicts. The description should be as concise as possible, yet as detailed as the image requires. The description will be used as alternative text (known as alt text): text associated with an image that serves the same purpose and conveys the same essential information as the image.\n\nInstructions:\n\n1) Answer with just the actual description, without reasoning or conversation.\n2) Don’t start with ”The image depicts” or a similar phrase, but with what kind of image it is, for example, a photo, a black-and-white photo, a painting, a drawing, an etching etc.\n3) The important details should appear in the first few words.\n4) If the picture in the image has a frame, ignore it.'
      },
    ],
    helpers: {
      filenamePrompt: {
        sv: 'Bildens filnamn är {{FILENAME}}. Filnamnet kan innehålla användbara namn eller nyckelord, men observera att det saknar diakritiska tecken och kan innehålla irrelevanta sifferserier.',
        fi: 'Kuvan tiedostonimi on {{FILENAME}}. Tiedostonimi saattaa sisältää arvokkaita avainsanoja, mutta huomaa, ettei se sisälla diakriittisiä merkkejä ja voi sisältää irrelevantteja numerosarjoja.',
        en: 'The filename of the image is {{FILENAME}}. The filename can contain useful names or keywords, but notice that the letters lack diacritics and the filename can contain irrelevant series of numbers.'
      },
      translatePrompt: {
        sv: 'Översätt nedanstående text till svenska (originalspråkets ISO-639-1 kod är `{{ORIG_LANG_CODE}}`). Svara endast med den översatta texten.',
        fi: 'Käännä alla oleva teksti suomeksi (alkuperäiskielen ISO-639-1 koodi on `{{ORIG_LANG_CODE}}`). Vastaa ainoastaan käännetyllä tekstillä.',
        en: 'Translate the text below to English (the ISO-639-1 code of the source language is `{{ORIG_LANG_CODE}}`). Answer with just the translated text.'
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
        prompt: 'Your task is to accurately transcribe handwritten, typewritten or printed historical documents, minimizing the CER and WER. Work character by character, word by word, line by line, transcribing the text exactly as it appears on the page. To maintain the authenticity of the historical text, retain spelling errors, grammar, syntax, capitalization, and punctuation as well as line breaks. Transcribe all the text on the page including headers, footers, marginalia, insertions, page numbers, etc. If insertions or marginalia are present, insert them where indicated by the author (as applicable). Exclude archival stamps, text on colour patches, and document references from your transcription. In your final response write only your transcription.'
      },
      { id: 'noHeaders',
        label: 'Ignore headers/footers/page numbers',
        prompt: 'Your task is to accurately transcribe handwritten, typewritten or printed historical documents, minimizing the CER and WER. Work character by character, word by word, line by line, transcribing the text exactly as it appears on the page. To maintain the authenticity of the historical text, retain spelling errors, grammar, syntax, capitalization, and punctuation as well as line breaks. Include marginalia and insertions in your transcription, but ignore headers, footers and page numbers. If insertions or marginalia are present, insert them where indicated by the author (as applicable). Exclude archival stamps, text on colour patches, and document references from your transcription. In your final response write only your transcription.'
      },
    ],
    helpers: {
      teiEncodePrompt: '# Task\n\nBelow is an accurate transcription of a handwritten, typewritten or printed historical document. Your task is to enrich the transcription with basic TEI XML markup. Omit the `<teiHeader>` and just answer with the text `<body>`. A facsimile image of the original document is attached for reference.\n\n## Transcription:\n\n```\n{{AI_TRANSCRIPTION}}\n```\n\n## Don’t encode:\n\n- text divisions (`<div>`)\n\n## Encode:\n\n- headings (`<head>`)\n- paragraphs (`<p>`; add `rend="noIndent"` to paragraphs that do not have first line indentation)\n- page beginnings (`<pb/>`; if no page number is visible in the facsimile, omit @n)\n- line beginnings (`<lb/>`)\n- footnotes (`<note>`)\n- line groups (`<lg>`)\n- tables (`<table>`)\n- lists (`<list>`)\n- highlights (`<hi>`; bold, italics, etc.)\n\n## Important:\n\n- Note that the `<lb/>` element marks the beginning of lines and should appear at the start of lines, not at the end.\n- Do not alter the transcribed text.\n- Maintain the line breaks.\n- Do not add text that is not in the transcription (headers, footers, and marginalia might have been omitted on purpose).\n\n## Example of TEI encoded text (the text itself has nothing to do with the attached transcription):\n\n```\n<body>\n<pb n="22"/>\n<p><lb/>I detta ögonblick hördes helt nära uppå det af eldarna\n<lb/>svagt belysta fältet en jemrande stämma ömkligen bönfalla om\n<lb/>hjelp. Soldaterna, vana vid sådant, hörde på den främmande\n<lb/>brytningen att mannen icke var deras och gjorde sig intet omak.\n<lb/>Men jemrandet fortfor, klagande och skärande, utan uppehåll.</p>\n<head><lb/><hi rend="italics">Slaget</hi></head>\n<p rend="noIndent"><lb/>Pekka, en af Bertilas fyra dragoner, kortvext, men stark som en\n<lb/>björn, gick motvilligt att tysta den jemrandes mun.</p>\n</body>\n```\n'
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
