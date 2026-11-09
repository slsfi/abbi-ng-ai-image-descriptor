import { inject, Injectable } from '@angular/core';
import { Document, IParagraphStyleOptions, Packer, Paragraph, Table,
         TableRow, TableCell, TextRun, WidthType
        } from 'docx';
import { zipSync, strToU8 } from 'fflate';

import { BatchResultsService } from './batch-results.service';
import { ImageListService } from './image-list.service';
import { BatchResult } from '../types/batch-result.types';
import { DescriptionData } from '../types/description-data.types';
import { ImageData } from '../types/image-data.types';
import { ExportFormatOption } from '../types/export.types';

const FALLBACK_FILENAME: string = 'image-descriptions';
const XML_MARKUP_PATTERN = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<(?:"[^"]*"|'[^']*'|[^<>'"])*>/g;

export const EXPORT_FORMAT_OPTIONS: ExportFormatOption[] = [
  { fileFormat: 'docx-table', label: 'Word-document, table-formatted (*.docx)', fileExt: 'docx' },
  { fileFormat: 'docx', label: 'Word-document, paragraph-formatted (*.docx)', fileExt: 'docx' },
  { fileFormat: 'txt', label: 'Plain text, single document (*.txt)', fileExt: 'txt' },
  { fileFormat: 'txt-zip', label: 'Plain text, one document per image, zipped (*.zip)', fileExt: 'zip' },
  { fileFormat: 'tei-xml', label: 'TEI XML-document (*.xml)', fileExt: 'xml' },
  { fileFormat: 'tei-xml-lb', label: 'TEI XML-document, with line beginning encoding (*.xml)', fileExt: 'xml' },
  { fileFormat: 'csv', label: 'Comma-separated values (*.csv)', fileExt: 'csv' },
  { fileFormat: 'tab', label: 'Tab-separated values (*.tab)', fileExt: 'tab' },
];

export const TEI_TRANSC_FORMAT_OPTIONS: ExportFormatOption[] = [
  { fileFormat: 'tei-xml-batch', label: 'TEI XML-document (*.xml)', fileExt: 'xml' },
  { fileFormat: 'tei-xml-batch-zip', label: 'TEI XML-documents, zipped (*.zip)', fileExt: 'zip' },
];

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private readonly batchResults = inject(BatchResultsService);
  private readonly imageListService = inject(ImageListService);

  private previousFileFormat: string | null = null;
  private previousFilename: string = FALLBACK_FILENAME;

  exportImageListToFile(fileFormat: string, filename?: string): void {
    const safeBaseFilename = this.sanitizeFilename(filename, FALLBACK_FILENAME);

    this.previousFileFormat = fileFormat;
    this.previousFilename = safeBaseFilename;

    if (fileFormat == 'docx-table') {
      this.generateDOCXTable(this.imageListService.imageList, safeBaseFilename);
    } else if (fileFormat == 'docx') {
      this.generateDOCX(this.imageListService.imageList, safeBaseFilename);
    } else if (fileFormat == 'csv') {
      this.generateCSV(this.imageListService.imageList, safeBaseFilename);
    } else if (fileFormat == 'tab') {
      this.generateTAB(this.imageListService.imageList, safeBaseFilename);
    } else if (fileFormat == 'tei-xml' || fileFormat == 'tei-xml-lb') {
      this.generateXML(this.imageListService.imageList, safeBaseFilename, fileFormat);
    } else if (fileFormat == 'tei-xml-batch') {
      this.generateXMLFromBatches(this.batchResults.results(), safeBaseFilename);
    } else if (fileFormat == 'tei-xml-batch-zip') {
      this.generateXMLZipFromBatches(this.batchResults.results(), safeBaseFilename);
    } else if (fileFormat == 'txt') {
      this.generateTXT(this.imageListService.imageList, safeBaseFilename);
    } else if (fileFormat == 'txt-zip') {
      this.generateTXTPerImageZip(this.imageListService.imageList, safeBaseFilename);
    } else {
      console.error('Unknown export format.');
    }
  }

  getPreviousFileFormat(): string | null {
    return this.previousFileFormat;
  }

  getPreviousFilename(): string {
    return this.previousFilename;
  }

  generateDOCX(imageFiles: ImageData[], filename: string = FALLBACK_FILENAME): void {
    // Provide an options object with sections
    const doc = new Document({
      styles: {
        paragraphStyles: [
          this.getDOCXParagraphStyle()
        ]
      },
      sections: [{
        properties: {},
        children: imageFiles.map((imageObj: ImageData) => {
          const descriptionObj = this.getActiveDescription(imageObj);
            return new Paragraph({
              children: [
                new TextRun({
                  text: imageObj.filename + ':',
                  bold: true
                }),
                new TextRun(' ' + this.normaliseForExport(descriptionObj?.description ?? ''))
              ],
              style: 'paragraph'
            });
          }
        )
      }]
    });

    Packer.toBlob(doc).then(blob => {
      this.initiateDownload(blob, `${filename}.docx`);
    });
  }

  generateDOCXTable(imageFiles: ImageData[], filename: string = FALLBACK_FILENAME): void {
    // Create table rows with cells containing filenames and descriptions
    const tableRows = imageFiles.map((imageObj: ImageData) => {
      const descriptionObj = this.getActiveDescription(imageObj);
      return new TableRow({
        children: [
          new TableCell({
            width: {
              size: 25,
              type: WidthType.PERCENTAGE,
            },
            margins: {
              top: 60,
              bottom: 60,
              left: 60,
              right: 60,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun(imageObj.filename)
                ],
                style: 'paragraph'
              })
            ]
          }),
          new TableCell({
            width: {
              size: 75,
              type: WidthType.PERCENTAGE,
            },
            margins: {
              top: 60,
              bottom: 60,
              left: 60,
              right: 60,
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun(this.normaliseForExport(descriptionObj?.description ?? ''))
                ],
                style: 'paragraph'
              })
            ]
          })
        ]
      });
    });
  
    // Create a table with the rows
    const table = new Table({
      rows: tableRows,
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      }
    });
  
    // Create the document
    const doc = new Document({
      styles: {
        paragraphStyles: [
          this.getDOCXParagraphStyle()
        ]
      },
      sections: [{
        properties: {},
        children: [table]
      }]
    });
  
    // Generate and download the document
    Packer.toBlob(doc).then(blob => {
      this.initiateDownload(blob, `${filename}.docx`);
    });
  }

  generateCSV(imageFiles: ImageData[], filename: string = FALLBACK_FILENAME): void {
    let data = this.convertToDelimited(imageFiles, ',');
    data = this.ensureNewlineEnding(data);
    const blob = new Blob([data], { type: 'text/csv;charset=UTF-8' });
    this.initiateDownload(blob, `${filename}.csv`);
  }

  generateTAB(imageFiles: ImageData[], filename: string = FALLBACK_FILENAME): void {
    let data = this.convertToDelimited(imageFiles, '\t');
    data = this.ensureNewlineEnding(data);
    const blob = new Blob([data], { type: 'text/tab-separated-values;charset=UTF-8' });
    this.initiateDownload(blob, `${filename}.tab`);
  }

  generateXML(
    imageFiles: ImageData[],
    filename: string = FALLBACK_FILENAME,
    fileFormat: string = 'tei-xml'
  ): void {
    let data = this.convertToTEIXML(imageFiles, fileFormat, filename);
    data = this.ensureNewlineEnding(data);
    const blob = new Blob([data], { type: 'application/xml;charset=UTF-8' });
    this.initiateDownload(blob, `${filename}.xml`);
  }

  generateXMLFromSingleBatch(batch: BatchResult): void {
    const batchFilename = `batch-${batch.batchIndex}`;
    let data = this.convertTeiBodyToTEIXML(batch.teiBody ?? '', batchFilename);
    data = this.ensureNewlineEnding(data);
    const blob = new Blob([data], { type: 'application/xml;charset=UTF-8' });
    this.initiateDownload(blob, `${batchFilename}.xml`);
  }

  generateXMLFromBatches(batchResults: BatchResult[], filename: string = FALLBACK_FILENAME): void {
    let concatBody = '';
    batchResults.forEach((batch: BatchResult) => {
      let imgDetails = (batch.imageIds.length > 1)
        ? `images ${batch.imageIds[0]+1}–${batch.imageIds[batch.imageIds.length-1]+1}`
        : `image ${batch.imageIds[0]+1}`
      imgDetails = imgDetails + ` (${batch.imageIds.length})`;

      const xmlComment = `Batch ${batch.batchIndex}: ${imgDetails}`;
      concatBody = concatBody + '\r\n' + `<!-- ${xmlComment} -->` + '\r\n';
      concatBody = concatBody + (batch.teiBody ?? '');
    });
    let data = this.convertTeiBodyToTEIXML(concatBody, filename);
    data = this.ensureNewlineEnding(data);
    const blob = new Blob([data], { type: 'application/xml;charset=UTF-8' });
    this.initiateDownload(blob, `${filename}.xml`);
  }

  generateXMLZipFromBatches(batchResults: BatchResult[], filename: string = FALLBACK_FILENAME): void {
    const files: Record<string, Uint8Array> = {};

    batchResults.forEach((batch: BatchResult) => {
      const batchFilename = `${filename}-batch-${batch.batchIndex}`;
      let txtContent = this.convertTeiBodyToTEIXML(batch.teiBody ?? '', batchFilename);
      txtContent = this.ensureNewlineEnding(txtContent);

      // Convert string to Uint8Array for fflate
      files[`${batchFilename}.xml`] = strToU8(txtContent);
    });

    this.zipAndInitiateDownload(files, `${filename}.zip`);
  }

  generateTXT(imageFiles: ImageData[], filename: string = FALLBACK_FILENAME): void {
    let data = '';
    imageFiles.forEach((imageObj: ImageData) => {
      const description = this.normaliseForExport(
        this.getActiveDescription(imageObj)?.description ?? '',
        '\n'
      );
      data += imageObj.filename + '\n';
      data += description + '\n\n';
      data += '---------------------------------------\n\n';
    });
    data = this.ensureNewlineEnding(data);
    const blob = new Blob([data], { type: 'text/plain;charset=UTF-8' });
    this.initiateDownload(blob, `${filename}.txt`);
  }

  private generateTXTPerImageZip(
    imageFiles: ImageData[],
    filename: string = FALLBACK_FILENAME
  ): void {
    const files: Record<string, Uint8Array> = {};

    imageFiles.forEach((imageObj: ImageData) => {
      const description = this.normaliseForExport(
        this.getActiveDescription(imageObj)?.description ?? '',
        '\n'
      );

      // Strip extension from the image filename to get the base name
      const baseName = this.getBaseName(imageObj.filename);

      const txtContent = this.ensureNewlineEnding(description);

      // Convert string to Uint8Array for fflate
      files[`${baseName}.txt`] = strToU8(txtContent);
    });

    this.zipAndInitiateDownload(files, `${filename}.zip`);
  }

  private zipAndInitiateDownload(
    files: Record<string, Uint8Array>,
    zipFilename: string
  ): void {
    // Create ZIP archive synchronously
    const zipped = zipSync(files); // Uint8Array<ArrayBufferLike>

    /**
     * `zipSync` returns a Uint8Array view over an underlying ArrayBufferLike.
     * We can't pass this Uint8Array directly to the Blob constructor because:
     *   1. TypeScript's DOM typings expect an ArrayBuffer (not ArrayBufferLike),
     *      which causes a type error.
     *   2. A Uint8Array is only a "view" into its buffer and may not start at
     *      offset 0 or cover the entire buffer.
     *
     * By calling `buffer.slice(byteOffset, byteOffset + byteLength)` we:
     *   - Create a fresh ArrayBuffer that contains exactly the bytes of this view.
     *   - Narrow the type to ArrayBuffer, which matches what BlobPart accepts.
     *
     * This avoids the TS type mismatch and guarantees Blob sees only the ZIP data.
     */
    const arrayBuffer = zipped.buffer.slice(
      zipped.byteOffset,
      zipped.byteOffset + zipped.byteLength
    ) as ArrayBuffer;

    const blob = new Blob([arrayBuffer], { type: 'application/zip' });
    this.initiateDownload(blob, zipFilename);
  }

  private convertToDelimited(imageFiles: ImageData[], delimiter: string): string {
    // We are only interested in the image filename and description properties
    let contentStr = '';
    imageFiles.forEach((imageObj: ImageData) => {
      let description = this.getActiveDescription(imageObj)?.description ?? '';
      description = this.normaliseForExport(description);
      description = this.escapeDelimitedValue(description, delimiter);
      const filename = this.escapeDelimitedValue(imageObj.filename, delimiter);
      contentStr += filename + delimiter + description + '\n';
    });
    return contentStr;
  }

  private convertToTEIXML(imageFiles: ImageData[], fileFormat: string, filename: string): string {
    // sniff first image description to see if it's TEI encoded
    const teiEncoded: boolean = imageFiles[0].descriptions[imageFiles[0].activeDescriptionIndex].teiEncoded ?? false;
    const useLb: boolean = teiEncoded ? false : (fileFormat === 'tei-xml-lb');

    let contentStr = this.getTeiHeader(filename);

    let imageCounter = 0;
    let bodyStr = '';
    imageFiles.forEach((imageObj: ImageData) => {
      imageCounter += 1;
      let description = this.getActiveDescription(imageObj)?.description ?? '';
      description = this.normaliseForExport(description, '\r\n', teiEncoded);
      if (teiEncoded) {
        bodyStr += description + '\r\n';
      } else {
        bodyStr += '\t\t\t<pb n="' + imageCounter + '" facs="' + imageObj.filename + '"/>\r\n';
        bodyStr += '\t\t\t<p>\r\n';
        bodyStr += `\t\t\t\t${useLb ? '<lb break="line"/>' : ''}` + description.replaceAll('\r\n', `\r\n\t\t\t\t${useLb ? '<lb break="line"/>' : ''}`);
        bodyStr += '\r\n\t\t\t</p>\r\n';
      }
    });

    if (useLb) {
      bodyStr = this.fixLbEncoding(bodyStr);
    }

    contentStr += bodyStr;
    contentStr += this.getTeiTrailer();
    return contentStr;
  }

  private convertTeiBodyToTEIXML(teiBody: string, filename: string): string {
    let trimmedBody = teiBody.trim();
    trimmedBody = this.extractBody(trimmedBody);
    trimmedBody = trimmedBody.trim() + '\r\n';

    let contentStr = this.getTeiHeader(filename);
    contentStr += trimmedBody;
    contentStr += this.getTeiTrailer();
    return contentStr;
  }

  private getTeiHeader(filename: string): string {
    let contentStr = '<?xml version="1.0" encoding="UTF-8"?>\r\n';
    contentStr += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\r\n';
    contentStr += '\t<teiHeader>\r\n';
    contentStr += '\t\t<fileDesc>\r\n';
    contentStr += '\t\t\t<titleStmt>\r\n';
    contentStr += '\t\t\t\t<title>' + filename + '</title>\r\n';
    contentStr += '\t\t\t</titleStmt>\r\n';
    contentStr += '\t\t\t<publicationStmt>\r\n';
    contentStr += '\t\t\t\t<publisher></publisher>\r\n';
    contentStr += '\t\t\t</publicationStmt>\r\n';
    contentStr += '\t\t\t<sourceDesc>\r\n';
    contentStr += '\t\t\t\t<p></p>\r\n';
    contentStr += '\t\t\t</sourceDesc>\r\n';
    contentStr += '\t\t</fileDesc>\r\n';
    contentStr += '\t</teiHeader>\r\n';
    contentStr += '\t<text>\r\n';
    contentStr += '\t\t<body xml:space="preserve">\r\n';
    return contentStr;
  }

  private getTeiTrailer(): string {
    let contentStr = '\t\t</body>\r\n';
    contentStr += '\t</text>\r\n';
    contentStr += '</TEI>\r\n';
    return contentStr;
  }

  private escapeDelimitedValue(value: any, delimiter: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    let valueStr = value.toString().replaceAll('\r', '').replaceAll('\n', ' ').replaceAll('\t', ' ');
    if (
      delimiter != '\t' &&
      (
        valueStr.includes(delimiter) || valueStr.includes('"')
      )
    ) {
      valueStr = `"${valueStr.replaceAll('"', '""')}"`;
    }

    return valueStr;
  }

  private initiateDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('style', 'display:none');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  private getActiveDescription(imageData: ImageData): DescriptionData | null {
    return imageData.descriptions.length > 0 ? imageData.descriptions[imageData.activeDescriptionIndex] : null;
  }

  private getDOCXParagraphStyle(): IParagraphStyleOptions {
    const styleObj = {
      id: 'paragraph',
      name: 'Paragraph',
      next: 'paragraph',
      quickFormat: true,
      run: {
        font: 'Cambria',
        size: 22 // 11pt font size (22 half-points)
      },
      paragraph: {
        spacing: {
          after: 240, // 12pt spacing below (240 twips)
          line: 300 // 1.25 line height (1.0 = 240)
        }
      }
    }

    return styleObj;
  }

  private getBaseName(filename: string): string {
    // Remove directory part if any and strip the extension
    const justName = filename.split(/[/\\]/).pop() ?? filename;
    return justName.replace(/\.[^/.]+$/, '');
  }

  private sanitizeFilename(name?: string, fallback: string = FALLBACK_FILENAME): string {
    // Start with trimmed input or fallback
    let filename = (name ?? '').trim();

    if (!filename) {
      filename = fallback;
    }

    // Remove characters that are illegal in Windows filenames:
    // \ / : * ? " < > |
    filename = filename.replace(/[\\\/:*?"<>|]/g, '_');

    // Remove ASCII control characters (0x00–0x1F and 0x7F)
    filename = filename.replace(/[\u0000-\u001F\u007F]/g, '');

    // Collapse multiple spaces to a single space (optional but neat)
    filename = filename.replace(/\s+/g, ' ');

    // Remove trailing dots and spaces (Windows really dislikes these)
    filename = filename.replace(/[. ]+$/g, '');

    // Avoid Windows reserved device names exactly: CON, PRN, AUX, NUL, COM1–COM9, LPT1–LPT9
    const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
    if (reserved.test(filename)) {
      filename = `_${filename}`;
    }

    // If we stripped everything, fall back again
    if (!filename) {
      filename = fallback;
    }

    // (Optional) Limit length to something reasonable to avoid absurd filenames
    const MAX_LEN = 100;
    if (filename.length > MAX_LEN) {
      filename = filename.slice(0, MAX_LEN);
    }

    return filename;
  }

  private ensureNewlineEnding(s: string): string {
    const newLine = s.includes('\r\n') ? '\r\n' : '\n';
    // Ensure the content ends with exactly one newline
    return !s.endsWith(newLine) ? s += newLine : s;
  }

  /**
   * Sets break="word" on the first <lb> on a line when the preceding line
   * ends in a hyphen that is not preceded by a space.
   *
   * Expects ordinary line breaks to have break="line" already. Preserves
   * other attributes and the input's LF/CRLF newline style, and ignores
   * apparent <lb> tags inside comments or CDATA.
   */
  private fixLbEncoding(s: string): string {
    const newLine = s.includes('\r\n') ? '\r\n' : '\n';
    const text = s.replaceAll('\r', '');
    let lastLbLineStart = -1;

    const fixed = this.mapLbTags(text, (tag, offset) => {
      const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
      if (lineStart === lastLbLineStart) return tag;
      lastLbLineStart = lineStart;

      if (lineStart > 0) {
        const previousLineStart = text.lastIndexOf('\n', lineStart - 2) + 1;
        const previousLine = text.slice(previousLineStart, lineStart - 1);
        if (previousLine.endsWith('-') && !previousLine.endsWith(' -')) {
          return this.setLbBreakAttribute(tag, 'word');
        }
      }

      return tag;
    });

    return fixed.replaceAll('\n', newLine);
  }

  /**
   * Transforms each unprefixed <lb> opening or self-closing tag, passing
   * the complete tag and its zero-based character offset in input.
   * Leaves text and other XML markup unchanged, including comments,
   * CDATA, and tag-like content inside quoted attribute values.
   */
  private mapLbTags(input: string, transform: (tag: string, offset: number) => string): string {
    return input.replace(XML_MARKUP_PATTERN, (tag, offset: number) =>
      /^<lb(?=[\s/>])/.test(tag) ? transform(tag, offset) : tag
    );
  }

  /**
   * Sets a single double-quoted break attribute on an unprefixed <lb>
   * opening or self-closing tag, removing any existing break attributes.
   * Preserves other attributes, their quoting and spacing, and the tag's
   * closing form. Attribute-like text inside quoted values is left intact.
   */
  private setLbBreakAttribute(tag: string, breakType: 'line' | 'word'): string {
    // Match whole attributes so text such as break="no" inside another value is preserved.
    const attributes = tag.slice(3, -1).replace(
      /\s+([^\s=/>]+)\s*=\s*(?:"[^"]*"|'[^']*')/g,
      (attribute, name: string) => name === 'break' ? '' : attribute
    );
    return `<lb break="${breakType}"${attributes}>`;
  }

  private normaliseForExport(s: string, newline = '\r\n', teiEncoded = false): string {
    // Remove all carriage returns
    let text = s.replaceAll('\r', '');

    if (teiEncoded) {
      text = text.trim();
      text = this.extractBody(text);
      text = text.trim();
    } else {
      // Replace straight quotation characters
      text = text.replaceAll("'", '’');
      text = text.replaceAll('"', '”');
    }

    return text.replaceAll('\n', newline);
  }

  /**
   * Extracts the content of a <body> element.
   * If a <pb .../> appears before <body>, it is preserved and moved
   * to the beginning of the extracted body content.
   */
  extractBody(text: string): string {
    let t = text.trim();

    // 1) Capture any leading <pb .../> before <body>
    const leadingPbMatch = t.match(/^(?:\s*(<pb\b[^>]*\/>))+/i);
    const leadingPb = leadingPbMatch ? leadingPbMatch[0].trim() : '';

    // 2) Remove leading <pb .../> from the text
    if (leadingPb) {
      t = t.slice(leadingPb.length).trimStart();
    }

    // 3) Remove opening <body ...> and closing </body>
    t = t.replace(/^<body\b[^>]*>/i, '');
    t = t.replace(/<\/body>\s*$/i, '');

    // 4) Reattach <pb .../> at the beginning of body content
    if (leadingPb) {
      t = `${leadingPb}\n${t}`;
    }

    return t.trim();
  }

  normaliseCharacters(s: string, teiEncoded: boolean = false, encodeLineBreakTypes: boolean = true): string {
    // Remove all carriage returns
    let text = s.replaceAll('\r', '');
    // Remove soft hyphen (U+00AD; &shy;) (invisible in VS Code)
    text = text.replaceAll('­', '');
    // Replace no-break spaces with ordinary spaces
    // text = text.replaceAll(' ', ' ');
    // Replace not signs with hyphens when followed by newlines
    text = text.replaceAll('¬\n', '-\n');
    // Replace hyphens with dashes when surrounded by combinations of space and newline
    text = text.replaceAll(' -\n', ' –\n');
    text = text.replaceAll('\n- ', '\n– ');
    text = text.replaceAll(' - ', ' – ');
    // Replace em dash with en dash
    text = text.replaceAll('—', '–');
    // Replace apostrophe-like characters
    if (!teiEncoded) {
      text = text.replaceAll("'", '’');
    }
    text = text.replaceAll('´', '’');
    // Entity encoding
    text = text.replaceAll('& ', '&amp; ');

    // Replace fractions (avoid when followed by a 2-, 3-, or 4-digit "year")
    text = text.replace(/ 1\/2 (?!\d{2,4})/g, ' ½ ');
    text = text.replace(/ 1\/3 (?!\d{2,4})/g, ' ⅓ ');
    text = text.replace(/ 2\/3 (?!\d{2,4})/g, ' ⅔ ');
    text = text.replace(/ 1\/4 (?!\d{2,4})/g, ' ¼ ');
    text = text.replace(/ 3\/4 (?!\d{2,4})/g, ' ¾ ');
    text = text.replace(/ 1\/5 (?!\d{2,4})/g, ' ⅕ ');
    text = text.replace(/ 2\/5 (?!\d{2,4})/g, ' ⅖ ');
    text = text.replace(/ 3\/5 (?!\d{2,4})/g, ' ⅗ ');
    text = text.replace(/ 4\/5 (?!\d{2,4})/g, ' ⅘ ');
    text = text.replace(/ 1\/6 (?!\d{2,4})/g, ' ⅙ ');
    text = text.replace(/ 5\/6 (?!\d{2,4})/g, ' ⅚ ');
    text = text.replace(/ 1\/7 (?!\d{2,4})/g, ' ⅐ ');
    text = text.replace(/ 1\/8 (?!\d{2,4})/g, ' ⅛ ');
    text = text.replace(/ 3\/8 (?!\d{2,4})/g, ' ⅜ ');
    text = text.replace(/ 5\/8 (?!\d{2,4})/g, ' ⅝ ');
    text = text.replace(/ 7\/8 (?!\d{2,4})/g, ' ⅞ ');
    text = text.replace(/ 1\/9 (?!\d{2,4})/g, ' ⅑ ');
    text = text.replace(/ 1\/10 (?!\d{2,4})/g, ' ⅒ ');

    // Insert no-break spaces as customary
    text = text.replaceAll('. . .', '. . .');
    text = text.replaceAll('o. s. v.', 'o. s. v.');

    text = text.trim();

    if (teiEncoded) {
      // Remove leading whitespace from all lines
      text = text.replace(/^[ \t]+/gm, '');

      if (text.startsWith('```') && text.endsWith('```')) {
        const lines = text.split('\n');
        let new_text = (lines[0] === '```xml' || lines[0] === '```')
          ? '' : lines[0] + '\n';
        
        for (let i = 1; i < lines.length - 1; i++) {
          new_text = new_text + lines[i] + '\n';
        }
        
        if (lines.at(-1) !== '```') {
          new_text = new_text + lines.at(-1) + '\n';
        }

        text = new_text;
      }

      text = text.trim();
      text = this.extractBody(text).trim();
      text = this.removeBlankLinesAroundPb(text);
      text = this.normaliseTeiStructureBeforeLb(text);
      text = this.tightenPbLb(text);
      text = this.tightenFootnoteSpacing(text);
      text = this.fixMisplacedParagraphBreaksAroundPb(text);
      text = this.stripShortPlainItalicHiTags(text);
      text = this.replaceStraightQuotesOutsideTags(text);

      if (encodeLineBreakTypes) {
        text = this.mapLbTags(text, tag => this.setLbBreakAttribute(tag, 'line'));
        text = this.fixLbEncoding(text);
      }
    } else {
      // Replace all double quotes only if not teiEncoded text
      text = text.replaceAll('"', '”');
    }

    return text;
  }

  /**
   * - Strip whitespace at start of a line before <lb>, with or without attributes
   * - If <lb> is not at start of a line: remove any whitespace right before it and insert '\n' before it
   * - <p>\n... -> <p>...
   * - Strip whitespace immediately before </p>
   */
  private normaliseTeiStructureBeforeLb(s: string): string {
    let text = s.replaceAll('\r', '');

    // Place each <lb> at the start of a line without touching other XML markup.
    let normalized = '';
    let lastIndex = 0;
    for (const match of text.matchAll(XML_MARKUP_PATTERN)) {
      let precedingText = text.slice(lastIndex, match.index);
      const tag = match[0];
      if (/^<lb(?=[\s/>])/.test(tag)) {
        precedingText = precedingText.replace(/[ \t]+$/, '');
        normalized += precedingText;
        if (normalized && !normalized.endsWith('\n')) normalized += '\n';
      } else {
        normalized += precedingText;
      }
      normalized += tag;
      lastIndex = match.index + tag.length;
    }
    text = normalized + text.slice(lastIndex);

    // <p ...> followed by newline becomes <p ...> (and also eats leading whitespace after that newline)
    //    Example: "<p rend="noIndent">\n   Text" -> "<p rend="noIndent">Text"
    text = text.replace(/(<p\b[^>]*>)\s*\n\s*/g, '$1');

    // Strip whitespace immediately before </p>
    //    Example: "Text   </p>" or "Text\n</p>" -> "Text</p>"
    text = text.replace(/\s+<\/p>/g, '</p>');

    return text;
  }

  /**
   * Replaces straight quotation marks and apostrophes only outside XML markup.
   * i.e. transforms:  <p foo="bar">He said "hi"</p>
   * into:             <p foo="bar">He said ”hi”</p>
   * and transforms:   <p foo='bar'>It's 'quoted'</p>
   * into:             <p foo='bar'>It’s ’quoted’</p>
   */
  private replaceStraightQuotesOutsideTags(input: string): string {
    let out = '';
    let lastIndex = 0;
    const replaceQuotes = (text: string) => text.replaceAll('"', '”').replaceAll("'", '’');

    for (const match of input.matchAll(XML_MARKUP_PATTERN)) {
      out += replaceQuotes(input.slice(lastIndex, match.index)) + match[0];
      lastIndex = match.index + match[0].length;
    }

    return out + replaceQuotes(input.slice(lastIndex));
  }

  /**
   * Removes blank/whitespace-only lines immediately before or after <pb .../>.
   * Keeps <pb/> on its own line if it is already there.
   */
  private removeBlankLinesAroundPb(input: string): string {
    let text = input.replaceAll('\r', '');

    // Remove one or more blank lines BEFORE a <pb .../> line.
    // (i.e. collapse "\n\n<pb.../>" -> "\n<pb.../>")
    text = text.replace(/\n(?:[ \t]*\n)+(?=[ \t]*<pb\b[^>]*\/>)/g, '\n');

    // Remove one or more blank lines AFTER a <pb .../> line.
    // (i.e. collapse "<pb.../>\n\n" -> "<pb.../>\n")
    text = text.replace(/(<pb\b[^>]*\/>)[ \t]*\n(?:[ \t]*\n)+/g, '$1\n');

    return text;
  }

  /**
   * Ensures <pb .../> followed by a continued line uses the required inline pattern:
   *   <pb .../><lb .../>
   * i.e. removes any whitespace/newlines between <pb .../> and the following <lb .../>.
   */
  private tightenPbLb(input: string): string {
    // Remove whitespace (spaces/tabs/newlines) between <pb .../> and the next <lb .../>
    return input.replace(
      /(<pb\b[^>]*\/>)\s+(<lb\b[^>]*\/>)/g,
      '$1$2'
    );
  }

  /**
   * Removes a single space immediately before a footnote <note>.
   * Applies only to notes with place="foot".
   */
  private tightenFootnoteSpacing(input: string): string {
    return input.replace(
      / (\<note\b[^>]*\bplace="foot"[^>]*>)/g,
      '$1'
    );
  }

  /**
   * Repairs a common model error where a page break is wrapped between two
   * paragraph tags even though the text appears to continue as the same
   * paragraph.
   *
   * It merges only conservative cases:
   * - the character immediately before </p> is not whitespace, . ? ! or >
   * - the next paragraph starts with a non-whitespace text character
   * - that first text character is not uppercase
   *
   * The explicit exclusion of > means we skip cases like </note></p>, where
   * the paragraph ends with a closing tag and we cannot safely infer the last
   * visible text character before </p>.
   *
   * Example:
   *
   * a paragraph that should</p>
   * <pb n="32"/>
   * <p rend="noIndent">not be broken because of a page break
   *
   * becomes:
   *
   * a paragraph that should
   * <pb n="32"/><lb/>not be broken because of a page break
   */
  private fixMisplacedParagraphBreaksAroundPb(input: string): string {
    return input.replace(
      /([^\s.?!>])\s*<\/p>\s*(<pb\b[^>]*\/>)(?:\s*<lb\b[^>]*\/>)?\s*<p\b[^>]*>\s*([^\s<])/gu,
      (match, precedingChar: string, pbTag: string, firstChar: string) => {
        if (/\p{Lu}/u.test(firstChar)) {
          return match;
        }

        return `${precedingChar}\n${pbTag}<lb/>${firstChar}`;
      }
    );
  }

  /**
   * Strips short plain-text <hi rend="italics">...</hi> spans, but leaves
   * any highlighted content containing nested tags untouched.
   */
  private stripShortPlainItalicHiTags(input: string): string {
    return input.replace(
      /<hi\b(?=[^>]*\brend=(["'])italics\1)[^>]*>([^<]*)<\/hi>/gu,
      (match, _quote: string, content: string) => {
        if (content.length > 30) {
          return match;
        }

        return content;
      }
    );
  }

}
