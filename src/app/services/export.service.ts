import { inject, Injectable } from '@angular/core';
import { Document, IParagraphStyleOptions, Packer, Paragraph, Table,
         TableRow, TableCell, TextRun, WidthType
        } from 'docx';
import { zipSync, strToU8 } from 'fflate';

import { ImageListService } from './image-list.service';
import { DescriptionData } from '../types/description-data.types';
import { ImageData } from '../types/image-data.types';
import { ExportFormatOption } from '../types/export.types';

const FALLBACK_FILENAME: string = 'image-descriptions';

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

@Injectable({
  providedIn: 'root'
})
export class ExportService {
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
    } else if (fileFormat == 'txt') {
      this.generateTXT(this.imageListService.imageList, safeBaseFilename);
    } else if (fileFormat == 'txt-zip') {
      this.generateTXTPerImageZip(this.imageListService.imageList, safeBaseFilename);
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
                new TextRun(' ' + (descriptionObj?.description ?? ''))
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
                  new TextRun(descriptionObj?.description ?? '')
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

  generateTXT(imageFiles: ImageData[], filename: string = FALLBACK_FILENAME): void {
    let data = '';
    imageFiles.forEach((imageObj: ImageData) => {
      const description = this.getActiveDescription(imageObj)?.description ?? '';
      data += imageObj.filename + '\n';
      data += description + '\n\n';
      data += '---------------------------------------\n\n';
    });
    data = this.ensureNewlineEnding(data);
    const blob = new Blob([data], { type: 'text/plain;charset=UTF-8' });
    this.initiateDownload(blob, `${filename}.txt`);
  }

  private generateTXTPerImageZip(imageFiles: ImageData[], filename: string = FALLBACK_FILENAME): void {
    const files: { [name: string]: Uint8Array } = {};

    imageFiles.forEach((imageObj: ImageData) => {
      const description = this.getActiveDescription(imageObj)?.description ?? '';

      // Strip extension from the image filename to get the base name
      const baseName = this.getBaseName(imageObj.filename);

      const txtContent = this.ensureNewlineEnding(description);

      // Convert string to Uint8Array for fflate
      files[`${baseName}.txt`] = strToU8(txtContent);
    });

    // Create ZIP archive synchronously
    const zipped = zipSync(files);  // Uint8Array<ArrayBufferLike>

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
    this.initiateDownload(blob, `${filename}.zip`);
  }

  private convertToDelimited(imageFiles: ImageData[], delimiter: string): string {
    // We are only interested in the image filename and description properties
    let contentStr = '';
    imageFiles.forEach((imageObj: ImageData) => {
      let description = this.getActiveDescription(imageObj)?.description ?? '';
      description = description.replaceAll('"', '”');
      description = this.escapeDelimitedValue(description, delimiter);
      const filename = this.escapeDelimitedValue(imageObj.filename, delimiter);
      contentStr += filename + delimiter + description + '\n';
    });
    return contentStr;
  }

  private convertToTEIXML(imageFiles: ImageData[], fileFormat: string, filename: string): string {
    const useLb: boolean = (fileFormat == 'tei-xml-lb');

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

    let imageCounter = 0;
    let bodyStr = '';
    imageFiles.forEach((imageObj: ImageData) => {
      imageCounter += 1;
      let description = this.getActiveDescription(imageObj)?.description ?? '';
      description = this.tidyString(description);
      bodyStr += '\t\t\t<pb n="' + imageCounter + '" facs="' + imageObj.filename + '"/>\r\n';
      bodyStr += '\t\t\t<p>\r\n';
      bodyStr += `\t\t\t\t${useLb ? '<lb break="line"/>' : ''}` + description.replaceAll('\r\n', `\r\n\t\t\t\t${useLb ? '<lb break="line"/>' : ''}`);
      bodyStr += '\r\n\t\t\t</p>\r\n';
    });

    if (useLb) {
      bodyStr = this.fixLbEncoding(bodyStr);
    }

    contentStr += bodyStr;
    contentStr += '\t\t</body>\r\n';
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

  private fixLbEncoding(s: string): string {
    const newLine = s.includes('\r\n') ? '\r\n' : '\n';
    const text = s.replaceAll('\r', '');
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (i > 0 && lines[i-1].endsWith('-') && !lines[i-1].endsWith(' -')) {
        lines[i] = lines[i].replace('<lb break="line"/>', '<lb break="word"/>');
      }
    }

    return lines.join(newLine);
  }

  private tidyString(s: string, outputNewline: string = '\r\n'): string {
    // Remove all carriage returns for processing
    let text = s.replaceAll('\r', '');
    // Remove soft hyphen (U+00AD; &shy;) (invisible in VS Code)
    text = text.replaceAll('­', '');
    // Replace no-break spaces with ordinary spaces
    text = text.replaceAll(' ', '');
    // Replace not signs with hyphens when followed by newlines
    text = text.replaceAll('¬\n', '-\n');
    // Replace hyphens with dashes when surrounded by combinations of space and newline
    text = text.replaceAll(' -\n', ' –\n');
    text = text.replaceAll('\n- ', '\n– ');
    text = text.replaceAll(' - ', ' – ');
    // Replace em dash with en dash
    text = text.replaceAll('—', '–');
    // Replace apostrophe-like characters
    text = text.replaceAll("'", '’');
    text = text.replaceAll('´', '’');
    text = text.replaceAll('"', '”');
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

    return text.replaceAll('\n', outputNewline);
  }

}
