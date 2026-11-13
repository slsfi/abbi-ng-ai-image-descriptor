import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { strFromU8, unzipSync } from 'fflate';

import { BatchResultsService } from './batch-results.service';
import { ExportService } from './export.service';
import { ImageListService } from './image-list.service';
import { DescriptionData } from '../types/description-data.types';
import { ImageData } from '../types/image-data.types';

describe('ExportService', () => {
  let service: ExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ExportService,
        {
          provide: BatchResultsService,
          useValue: {
            results: signal([]),
          },
        },
        {
          provide: ImageListService,
          useValue: {
            imageList: [],
          },
        },
      ],
    });

    service = TestBed.inject(ExportService);
  });

  afterEach(() => vi.restoreAllMocks());

  it.each([false, true])('makes character substitutions optional while retaining basic cleanup (TEI: %s)', teiEncoded => {
    const input = `  "It's" ´ - — soft\u00ADhyphen 1/2 unit . . . o. s. v. & text\r\nhyphen¬\r\nated  `;

    expect(service.normaliseCharacters(input, teiEncoded)).toBe(
      '”It’s” ’ – – softhyphen ½ unit .\u00A0.\u00A0. o.\u00A0s.\u00A0v. &amp; text\nhyphen-\nated'
    );
    expect(service.normaliseCharacters(input, teiEncoded, { normaliseCharacters: false })).toBe(
      `"It's" ´ - — soft\u00ADhyphen 1/2 unit . . . o. s. v. &amp; text\nhyphen-\nated`
    );
  });

  it('keeps correcting not signs at line endings with all optional postprocessing disabled', () => {
    const input = '<body><p>hyphen¬\r\n<lb/>ated word; a ¬ b</p></body>';

    expect(service.normaliseCharacters(input, true, {
      normaliseCharacters: false,
      repairParagraphBreaksAcrossPages: false,
      encodeLineBreakTypes: false,
      stripShortPlainItalicHiTags: false
    })).toBe('<p>hyphen-\n<lb/>ated word; a ¬ b</p>');
  });

  it('encodes ordinary and hyphenated TEI line breaks by default', () => {
    const input = '<body><p><lb/>First line\n<lb/>hyphen-\n<lb/>ated word</p></body>';

    expect(service.normaliseCharacters(input, true)).toBe(
      '<p><lb break="line"/>First line\n<lb break="line"/>hyphen-\n<lb break="word"/>ated word</p>'
    );
  });

  it.each([false, true])('normalises no-break spaces before space-sensitive replacements only when enabled (TEI: %s)', teiEncoded => {
    const input = 'A\u00A0-\u00A0B; value\u00A01/2\u00A0unit; date\u00A01/2\u00A01900; .\u00A0.\u00A0. o.\u00A0s.\u00A0v.';

    expect(service.normaliseCharacters(input, teiEncoded)).toBe(
      'A – B; value ½ unit; date 1/2 1900; .\u00A0.\u00A0. o.\u00A0s.\u00A0v.'
    );
    expect(service.normaliseCharacters(input, teiEncoded, { normaliseCharacters: false })).toBe(input);
  });

  it.each([
    { tag: '<lb n="1" break="no" rend="visible"/>', attributes: { n: '1', rend: 'visible' } },
    { tag: "<lb break = 'yes' n='2' />", attributes: { n: '2' } },
    { tag: '<lb\n n="3"\n break="word"\n facs="#line-3" />', attributes: { n: '3', facs: '#line-3' } },
    { tag: '<lb break="no" break=\'yes\' n="4"/>', attributes: { n: '4' } },
    { tag: '<lb n="5"></lb>', attributes: { n: '5' } },
    { tag: '<lb n="6" data-break="no" xml:break="keep"/>', attributes: { n: '6', 'data-break': 'no', 'xml:break': 'keep' } },
    { tag: `<lb rend="break='no' > marker" break="no" n='7'/>`, attributes: { rend: "break='no' > marker", n: '7' } }
  ])('replaces existing break attributes and preserves other attributes in $tag', ({ tag, attributes }) => {
    const output = service.normaliseCharacters(`<body><p>${tag}Text</p></body>`, true);
    const xml = new DOMParser().parseFromString(output, 'application/xml');
    expect(xml.querySelector('parsererror')).toBeNull();
    const lb = xml.querySelector('lb')!;
    expect(lb.getAttribute('break')).toBe('line');
    expect(Object.fromEntries(Array.from(lb.attributes)
      .filter(attribute => attribute.name !== 'break')
      .map(attribute => [attribute.name, attribute.value])))
      .toEqual(attributes);
  });

  it.each([
    '<lb n="2" break="no" rend="visible"/>',
    "<lb break = 'yes' n='2' />",
    '<lb\n n="2"\n break="line" />'
  ])('detects word continuations in an attributed line break: %s', tag => {
    const output = service.normaliseCharacters(`<p>hyphen-${tag}ated word</p>`, true);
    const xml = new DOMParser().parseFromString(output, 'application/xml');
    expect(xml.querySelector('parsererror')).toBeNull();
    expect(xml.querySelector('lb')!.getAttribute('break')).toBe('word');
    expect(xml.querySelector('lb')!.getAttribute('n')).toBe('2');
    expect(output).toContain('hyphen-\n<lb');
  });

  it('encodes an attributed word continuation after a page break without changing later line breaks', () => {
    const input = '<p>hyphen-\r\n<pb n="2"/><lb n="3" break="yes"/>ated word\r\n<lb n="4" break="word"/>Next line</p>';

    expect(service.normaliseCharacters(input, true)).toBe(
      '<p>hyphen-\n<pb n="2"/><lb break="word" n="3"/>ated word\n<lb break="line" n="4"/>Next line</p>'
    );
  });

  it('leaves existing break attributes and other attributes intact when encoding is disabled', () => {
    const input = '<p>hyphen-\n<lb n="2" break=\'no\' rend="visible"/>ated word\n<lb n="3"/>Next line</p>';

    expect(service.normaliseCharacters(input, true, { encodeLineBreakTypes: false })).toBe(input);
  });

  it('does not encode lb text inside comments or CDATA, or attributes on other elements', () => {
    const input = '<p><!-- <lb break="no"/> -->\n<![CDATA[<lb break="yes"/>]]>\n<lbreak break="no"/><lb n="1"/>Text</p>';
    const output = service.normaliseCharacters(input, true);

    expect(output).toContain('<!-- <lb break="no"/> -->');
    expect(output).toContain('<![CDATA[<lb break="yes"/>]]>');
    expect(output).toContain('<lbreak break="no"/>');
    expect(new DOMParser().parseFromString(output, 'application/xml').querySelectorAll('lb')).toHaveLength(1);
    expect(output).toContain('<lb break="line" n="1"/>');
  });

  it('normalizes quotation marks in text while preserving XML attribute quotes', () => {
    const input = `<p n='1' rend='a > b'>He said "don't".</p>`;

    expect(service.normaliseCharacters(input, true)).toBe(
      `<p n='1' rend='a > b'>He said ”don’t”.</p>`
    );
  });

  it('normalises all straight quotes in plain text, including inside angle-bracket expressions', () => {
    const input = `He said "don't"; 1 < 2 'yes' > 0.`;

    expect(service.normaliseCharacters(input)).toBe('He said ”don’t”; 1 < 2 ’yes’ > 0.');
    expect(service.normaliseCharacters(input, false, { normaliseCharacters: false })).toBe(input);
  });

  it('preserves quotes in TEI attributes, comments and CDATA before removing code fences and body wrappers', () => {
    const content = `<p><!-- "don't" --><![CDATA["don't"]]><seg rend="a > 'b'">He said "don't".</seg></p>`;
    const input = '```xml\n<body>\n' + content + '\n</body>\n```';

    expect(service.normaliseCharacters(input, true)).toBe(
      `<p><!-- "don't" --><![CDATA["don't"]]><seg rend="a > 'b'">He said ”don’t”.</seg></p>`
    );
  });

  it('skips both line break encoding steps when disabled while retaining other TEI cleanup', () => {
    const input = '<body><p>\n<lb/>A <hi rend="italics">short</hi> line\n<lb/>hyphen-\n<lb/>ated word-\n<lb break="line"/>existing encoding</p></body>';

    expect(service.normaliseCharacters(input, true, { encodeLineBreakTypes: false })).toBe(
      '<p><lb/>A short line\n<lb/>hyphen-\n<lb/>ated word-\n<lb break="line"/>existing encoding</p>'
    );
  });

  it('merges a paragraph split around a page break when the text clearly continues', () => {
    const input = `a paragraph that should</p>
<pb n="32"/>
    <p rend="noIndent">not be broken because of a page break`;

    expect(service.normaliseCharacters(input, true)).toBe(
      'a paragraph that should\n<pb n="32"/><lb break="line"/>not be broken because of a page break'
    );
  });

  it('merges the split also when the page break has no n attribute', () => {
    const input = `continued text</p>
<pb/>
<p>still the same paragraph`;

    expect(service.normaliseCharacters(input, true)).toBe(
      'continued text\n<pb/><lb break="line"/>still the same paragraph'
    );
  });

  it('preserves paragraph boundaries and attributes when repair is disabled while retaining other cleanup', () => {
    const input = `<body><p n="1">He said "don't" and continued</p>\n<pb n="2"/>\n<p rend="noIndent">on the next page</p></body>`;

    expect(service.normaliseCharacters(input, true, { repairParagraphBreaksAcrossPages: false })).toBe(
      '<p n="1">He said ”don’t” and continued</p>\n<pb n="2"/>\n<p rend="noIndent">on the next page</p>'
    );
  });

  it('merges the split when the misplaced page break already includes an lb tag', () => {
    const input = `a paragraph that should</p>
<pb n="32"/><lb/><p rend="noIndent">not be broken because of a page break`;

    expect(service.normaliseCharacters(input, true)).toBe(
      'a paragraph that should\n<pb n="32"/><lb break="line"/>not be broken because of a page break'
    );
  });

  it('keeps the paragraph break when the following paragraph starts with an uppercase letter', () => {
    const input = `a heading lead-in</p>
<pb n="32"/>
<p rend="noIndent">Åter börjar en ny paragraf`;

    expect(service.normaliseCharacters(input, true)).toBe(input);
  });

  it('strips short plain-text hi italics tags', () => {
    const input = '<p>Det står <hi rend="italics">obs.</hi> i marginalen</p>';

    expect(service.normaliseCharacters(input, true)).toBe(
      '<p>Det står obs. i marginalen</p>'
    );
  });

  it('keeps hi italics tags when they contain nested tags', () => {
    const input = '<p><hi rend="italics">obs.<note place="foot">1</note></hi></p>';

    expect(service.normaliseCharacters(input, true)).toBe(input);
  });

  it.each([true, false])('preserves short italic highlighting when disabled independently of line break encoding (%s)', encode => {
    const input = '<body><p>\n<lb/><hi rend="italics">"obs."</hi></p></body>';

    expect(service.normaliseCharacters(input, true, {
      encodeLineBreakTypes: encode,
      stripShortPlainItalicHiTags: false
    })).toBe(
      `<p><lb${encode ? ' break="line"' : ''}/><hi rend="italics">”obs.”</hi></p>`
    );
  });

  it('keeps hi italics tags when the text content is longer than 30 characters', () => {
    const input = '<p><hi rend="italics">detta är en ganska lång kursiv markering</hi></p>';

    expect(service.normaliseCharacters(input, true)).toBe(input);
  });

  it('keeps the paragraph break when the paragraph ends with a closing tag', () => {
    const input = `<p>Detta slutar med en fotnot<note place="foot">1</note></p>
<pb n="32"/>
<p rend="noIndent">fortsÃ¤ttning pÃ¥ nÃ¤sta sida</p>`;

    expect(service.normaliseCharacters(input, true)).toBe(input);
  });

  it.each(['txt', 'txt-zip', 'csv', 'tab', 'tei-xml', 'tei-xml-lb', 'docx', 'docx-table'])(
    'exports %s using each active result’s character setting, including the default for older results', async format => {
      const download = vi.spyOn(service as any, 'initiateDownload').mockImplementation(() => {});
      const images: ImageData[] = [false, true, undefined].map((normaliseCharacters, index) => {
        const active: DescriptionData = {
          description: `Result ${index}: "It's" — 1/2 unit`, normaliseCharacters,
          model: 'test', inputTokens: 0, outputTokens: 0, cost: 0
        };
        return {
          id: index, filename: `image-${index}.png`, uploadKey: `upload-${index}`, base64Image: '', height: 1, width: 1,
          descriptions: [{ ...active, description: 'Inactive result' }, active],
          activeDescriptionIndex: 1, generating: false
        };
      });
      TestBed.inject(ImageListService).imageList.push(...images);

      service.exportImageListToFile(format, 'results');
      await vi.waitFor(() => expect(download).toHaveBeenCalledOnce());
      const blob = download.mock.calls[0][0] as Blob;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let text: string;
      if (format === 'txt-zip') {
        text = Object.values(unzipSync(bytes)).map(content => strFromU8(content)).join('\n');
      } else if (format.startsWith('docx')) {
        text = strFromU8(unzipSync(bytes)['word/document.xml']);
      } else {
        text = strFromU8(bytes);
      }
      if (format.startsWith('docx') || format.startsWith('tei-xml')) {
        const xml = new DOMParser().parseFromString(text, 'application/xml');
        expect(xml.querySelector('parsererror')).toBeNull();
        text = xml.documentElement.textContent!;
      } else if (format === 'csv') {
        text = text.replaceAll('""', '"');
      }

      expect(text).toContain(`Result 0: "It's" — 1/2 unit`);
      expect(text).toContain('Result 1: ”It’s” — 1/2 unit');
      expect(text).toContain('Result 2: ”It’s” — 1/2 unit');
      expect(text).not.toContain('Inactive result');
      expect(images[1].descriptions[1].description).toBe(`Result 1: "It's" — 1/2 unit`);
    }
  );
});
