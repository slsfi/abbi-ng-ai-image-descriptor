import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BatchResultsService } from './batch-results.service';
import { ExportService } from './export.service';
import { ImageListService } from './image-list.service';

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

  it('encodes ordinary and hyphenated TEI line breaks by default', () => {
    const input = '<body><p><lb/>First line\n<lb/>hyphen-\n<lb/>ated word</p></body>';

    expect(service.normaliseCharacters(input, true)).toBe(
      '<p><lb break="line"/>First line\n<lb break="line"/>hyphen-\n<lb break="word"/>ated word</p>'
    );
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

    expect(service.normaliseCharacters(input, true, false)).toBe(input);
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

  it('skips both line break encoding steps when disabled while retaining other TEI cleanup', () => {
    const input = '<body><p>\n<lb/>A <hi rend="italics">short</hi> line\n<lb/>hyphen-\n<lb/>ated word-\n<lb break="line"/>existing encoding</p></body>';

    expect(service.normaliseCharacters(input, true, false)).toBe(
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

    expect(service.normaliseCharacters(input, true, encode, false)).toBe(
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
});
