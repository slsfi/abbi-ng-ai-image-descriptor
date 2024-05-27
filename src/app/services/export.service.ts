import { Injectable } from '@angular/core';
import { Document, Packer, Paragraph, TextRun } from 'docx';

import { descriptionData } from '../types/description-data.types';
import { imageData } from '../types/image-data.types';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  generateDOCX(imageFiles: imageData[], filename: string = 'image-descriptions.docx'): void {
    // Provide an options object with sections
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
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
        ]
      },
      sections: [{
        properties: {},
        children: imageFiles.map((imageObj: imageData) => {
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
      this.initiateDownload(blob, filename);
    });
  }

  generateCSV(imageFiles: imageData[], filename: string = 'image-descriptions.csv'): void {
    const data = this.convertToDelimited(imageFiles, ',');
    const blob = new Blob([data], { type: 'text/csv;charset=UTF-8' });
    this.initiateDownload(blob, filename);
  }

  generateTAB(imageFiles: imageData[], filename: string = 'image-descriptions.tab'): void {
    const data = this.convertToDelimited(imageFiles, '\t');
    const blob = new Blob([data], { type: 'text/tab-separated-values;charset=UTF-8' });
    this.initiateDownload(blob, filename);
  }

  private convertToDelimited(imageFiles: imageData[], delimiter: string): string {
    // We are only interested in the image filename and description properties
    let contentStr = '';
    imageFiles.forEach((imageObj: imageData) => {
      let description = this.getActiveDescription(imageObj)?.description ?? '';
      description = description.replaceAll('"', '”');
      description = this.escapeDelimitedValue(description, delimiter);
      const filename = this.escapeDelimitedValue(imageObj.filename, delimiter);
      contentStr += filename + delimiter + description + '\n';
    });
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

  private getActiveDescription(imageData: imageData): descriptionData | null {
    return imageData.descriptions.length > 0 ? imageData.descriptions[imageData.activeDescriptionIndex] : null;
  }
}
