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
