import { TaskTypeConfig } from "../../app/types/prompt.types"

export type TaskTypeId = 'altText' | 'transcription' | 'transcriptionBatchTei';
export type LanguageCode = 'sv' | 'fi' | 'en';

export const TASK_CONFIGS: TaskTypeConfig[] = [
  {
    taskType: 'altText',
    label: 'Generate alt texts',
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
    nouns: {
      singular: 'TEI transcription',
      plural: 'TEI transcriptions'
    },
    defaultModel: 'gemini-3-pro-preview',
    variants: [
      {
        id: 'default',
        label: 'TEI body (batched, no running headers)',
        prompt: 'You are transcribing a multi-page document from a sequence of images (each image is one page). The pages are provided in order. Your task is to produce a TEI (Text Encoding Initiative) XML transcription of the document content.\n\nOUTPUT REQUIREMENTS\n- Output ONLY a single TEI <body> element (no <TEI>, no <text>, no <teiHeader>, no commentary).\n- The output must be valid XML.\n- Do not wrap the output in code fences.\n\nPAGE ORDER, PAGE NUMBERS, AND PAGE BREAKS\n- Determine the page number for each page from any visible printed page number in the image. If a visible page number exists, encode the page break as <pb n="PAGE_NUMBER"/> using the exact number/marker as shown (e.g., 12, 12a, IV).\n- If there is no visible page number, use <pb/> with no @n.\nPAGE BREAKS INSIDE RUNNING TEXT\n- <pb/> is a milestone and MUST NOT cause structural breaks.\n- NEVER close or reopen <p> solely to insert a page break.\n\n- If a page break occurs in the middle of running text:\n  - Insert <pb/> (or <pb n="..."/>) INLINE\n  - Immediately follow it with <lb/>\n  - Continue the SAME paragraph\n\n- REQUIRED pattern:\n    ...last word on page<pb n="2"/><lb/>first word on next page...\n\n- FORBIDDEN patterns (DO NOT DO THESE):\n    </p><pb/><p>\n    <pb/>text\n    text<pb/>\n\nTEXTUAL DIVISIONS AND HEADINGS (TEI <div> / <head>)\n- Wrap the full transcription in <body> ... </body>.\n- Use textual divisions with <div> and headings with <head>. This is REQUIRED:\n  - Every time the document presents a NEW HEADING LEVEL, start a new <div>.\n    Examples: Part → Chapter → Section → Subsection; or Heading 1 → Heading 2 → Heading 3.\n  - Do NOT start a new <div> for subtitles that belong to the same heading. Instead, encode subtitles within the SAME division, immediately after the main <head>, using <head type="sub">...</head>.\n  - Nest divisions by level: higher-level headings contain lower-level <div> elements.\n  - If the level is unclear, infer it cautiously from typography/numbering/indentation and be consistent across the document. Do not invent extra levels.\n\nWHAT TO TRANSCRIBE (INCLUDE / EXCLUDE)\nInclude:\n- Main text, headings (<head>), subheadings (<head>), lists (<list>), tables (as best as reasonable, <table>), line groups (<lg>), openers (<opener>), closers (<closer>), and signatures (<signed>).\n- Marginalia, corrections, interlinear additions, and annotations that belong to the document content.\n- Footnotes and endnotes, including footnote markers/references and the note text.\n\nExclude:\n- Running headers and running footers that repeat on most pages (e.g., book title, author name, chapter title repeated at top, repeating footer text).\n- Standalone page numbers in header/footer areas (these are used only for <pb n="..."/> and should not be transcribed as running text).\nIf you are unsure whether something is a running header/footer vs. meaningful content, prefer excluding it ONLY when it is clearly repetitive and purely navigational.\n\nWITHIN DIVISIONS: PARAGRAPHS, LINE BREAKS, LISTS, TABLES\n- Use <p> for paragraphs.\n\n- LINE BREAKS (<lb/>):\n  - <lb/> marks the BEGINNING of a new line.\n  - <lb/> MUST appear immediately BEFORE the text of the new line.\n  - <lb/> MUST NOT appear at the end of a line.\n  - Never write text followed by <lb/>. This is INVALID.\n  - Correct pattern:\n      <p>\n        First line text\n        <lb/>Second line text\n        <lb/>Third line text\n      </p>\n  - Incorrect pattern (DO NOT DO THIS):\n      First line text<lb/>\n      Second line text<lb/>\n\n  - The first line of a paragraph normally has NO <lb/>.\n  - The ONLY time a paragraph starts with <lb/> is when it continues mid-line after a page break, in which case use:\n      <pb/><lb/>continued text\n\nLINE GROUPS AND VERSE (<lg> / <l>)\n- Use <lg> for line groups (e.g. poetry, verse, hymns).\n- Use <l> for individual verse lines.\n- If a verse line ends with a hyphenation mark, keep it at the end of that <l>.\n\n- IMPORTANT:\n  - NEVER use <lb/> inside <lg>.\n  - NEVER place <lb/> before, after, or inside <l>.\n  - Each <l> element already represents one line; <lb/> is redundant and forbidden there.\n\n  - Correct:\n      <lg>\n        <l>First verse line</l>\n        <l>Second verse line</l>\n      </lg>\n\n  - Incorrect (DO NOT DO THIS):\n      <lg>\n        <lb/><l>First verse line</l>\n        <lb/><l>Second verse line</l>\n      </lg>\n\nNOTES (FOOTNOTES AND MARGINALIA)\n- Use <note> for footnotes/endnotes and for marginal notes. Preserve the association:\n  - If a footnote marker exists in the main text (e.g., *, 1, ²), encode the footnote content as a <note> that appears at the point where the marker occurs in reading order. Place the footnote marker in @n.\n  - For marginalia, use <note place="margin"> ... </note> placed at the point in the main text where it most clearly applies. If placement is unclear, insert it near the closest relevant passage and keep it short and faithful.\n\nREADING ORDER\n- Maintain the natural reading order on each page: top to bottom, left to right.\n- Do not encode columns, instead merge the content of columns.\n\nUNCLEAR TEXT\n- Do not guess. If text is unreadable, use <gap reason="illegible"/> for the missing portion.\n- If you can read part of a word/name but not all, transcribe the readable part and use <gap reason="illegible"/> where needed.\n\nNORMALIZATION\n- To maintain the authenticity of the historical text, retain spelling errors, grammar, syntax, capitalization, and punctuation as well as line breaks. Minimize transcription errors.\n- Do not expand abbreviations.\n- Do not modernize language.\n- Preserve end-of-line hyphenation exactly as it appears in the source.\n  - Example:\n    Source (line break shown):\n      transkrip-\n      tion\n    Correct TEI:\n      transkrip-\n      <lb/>tion\n    Incorrect (DO NOT DO):\n      transkription\n      transkrip<lb/>tion\n\nFINAL CHECK (MANDATORY)\n- Ensure well-formed XML.\n- Ensure there is exactly one <body> root element in the output.\n- <lb/> rules:\n  - <lb/> appears ONLY at the START of lines.\n  - <lb/> NEVER appears at the end of a line.\n  - <lb/> NEVER appears inside <lg> or before/inside <l>.\n\n- <pb/> rules:\n  - <pb/> NEVER forces paragraph breaks.\n  - When a new page begins mid-paragraph, use <pb/><lb/> inline.\n\n- If any of these rules conflict, FOLLOW THE RULES ABOVE, NOT DEFAULT TEI HABITS.\n\n\n\n\n\n----------------------------------\n\n\nWHAT TO TRANSCRIBE (INCLUDE / EXCLUDE)\nInclude:\n- Main text, headings, subheadings, lists, tables (as best as reasonable), and signatures.\n- Marginalia, corrections, interlinear additions, and annotations that belong to the document content.\n- Footnotes and endnotes, including footnote markers/references and the note text.\n\nExclude:\n- Running headers and running footers that repeat on most pages (e.g., book title, author name, chapter title repeated at top, repeating footer text).\n- Page numbers (standalone page numbers in header/footer areas).\nIf you are unsure whether something is a running header/footer vs. meaningful content, prefer excluding it ONLY when it is clearly repetitive and purely navigational.\n\nSTRUCTURE AND TAGGING (TEI)\n- Wrap the full transcription in <body> ... </body>.\n- Use textual divisions with <div> and headings with <head>. This is REQUIRED:\n  - Every time the document presents a NEW HEADING LEVEL, start a new <div>.\n    Examples: Part → Chapter → Section → Subsection; or Heading 1 → Heading 2 → Heading 3.\n  - Do NOT start a new <div> for subtitles that belong to the same heading (e.g., a smaller line directly under a main heading that functions as a subtitle/strapline). Instead, encode subtitles within the SAME division, immediately after the main <head>, using <head type="sub">...</head>.\n  - Nest divisions by level: higher-level headings contain lower-level <div> elements.\n  - If the level is unclear, infer it cautiously from typography/numbering/indentation and be consistent across the document. Do not invent extra levels.\n\n- Within divisions:\n  - Use <p> for paragraphs.\n  - Use <lb/> for line breaks in paragraphs and headings. You must preserve the line breaks from the transcription in paragraphs!\n  - Use <list> and <item> for lists when the structure is clear.\n  - For tables, preserve as best as reasonable using lines and <lb/> or a simple list structure; do not hallucinate perfect table markup.\n\nNOTES (FOOTNOTES AND MARGINALIA)\n- Use <note> for footnotes/endnotes and for marginal notes. Preserve the association:\n  - If a footnote marker exists in the main text (e.g., *, 1, ²), encode the footnote content as a <note> that appears at the point where the marker occurs in reading order Place the footnote marker in @n.\n  - For marginalia, use <note place="margin"> ... </note> placed at the point in the main text where it most clearly applies. If placement is unclear, insert it near the closest relevant passage and keep it short and faithful.\n\nREADING ORDER\n- Maintain the natural reading order on each page: top to bottom, left to right.\n\nUNCLEAR TEXT\n- Do not guess. If text is unreadable, use <gap reason="illegible"/> for the missing portion.\n- If you can read part of a word/name but not all, transcribe the readable part and use <gap reason="illegible"/> where needed.\n\nNORMALIZATION\n- To maintain the authenticity of the historical text, retain spelling errors, grammar, syntax, capitalization, and punctuation as well as line breaks. Minimize CER and WER of the transcription.\n- Do not expand abbreviations.\n- Do not modernize language.\n\nFINAL CHECK\n- Ensure well-formed XML.\n- Ensure there is exactly one <body> root element in the output.\n'
      }
    ]
  }
] as const;

// Map of task types for lookups
export const TASK_TYPES_BY_ID = Object.fromEntries(
  TASK_CONFIGS.map(t => [t.taskType, t])
) as Record<TaskTypeId, TaskTypeConfig>;
