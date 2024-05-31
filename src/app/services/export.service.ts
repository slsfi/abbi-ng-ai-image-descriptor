import { Injectable } from '@angular/core';
import { Document, Packer, Paragraph, TextRun } from 'docx';

import { ImageListService } from './image-list.service';
import { DescriptionData } from '../types/description-data.types';
import { ImageData } from '../types/image-data.types';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(private imageListService: ImageListService) { }

  exportImageListToFile(fileExtension: string): void {
    if (fileExtension == 'docx') {
      this.generateDOCX(this.imageListService.imageList);
    } else if (fileExtension == 'csv') {
      this.generateCSV(this.imageListService.imageList);
    } else if (fileExtension == 'tab') {
      this.generateTAB(this.imageListService.imageList);
    }
  }

  generateDOCX(imageFiles: ImageData[], filename: string = 'image-descriptions.docx'): void {
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
      this.initiateDownload(blob, filename);
    });
  }

  generateCSV(imageFiles: ImageData[], filename: string = 'image-descriptions.csv'): void {
    const data = this.convertToDelimited(imageFiles, ',');
    const blob = new Blob([data], { type: 'text/csv;charset=UTF-8' });
    this.initiateDownload(blob, filename);
  }

  generateTAB(imageFiles: ImageData[], filename: string = 'image-descriptions.tab'): void {
    const data = this.convertToDelimited(imageFiles, '\t');
    const blob = new Blob([data], { type: 'text/tab-separated-values;charset=UTF-8' });
    this.initiateDownload(blob, filename);
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
}
