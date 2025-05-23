import { Injectable } from '@angular/core';
import { Document, IParagraphStyleOptions, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType } from 'docx';

import { ImageListService } from './image-list.service';
import { DescriptionData } from '../types/description-data.types';
import { ImageData } from '../types/image-data.types';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(private imageListService: ImageListService) { }

  exportImageListToFile(fileFormat: string): void {
    if (fileFormat == 'docx-table') {
      this.generateDOCXTable(this.imageListService.imageList);
    } else if (fileFormat == 'docx') {
      this.generateDOCX(this.imageListService.imageList);
    } else if (fileFormat == 'csv') {
      this.generateCSV(this.imageListService.imageList);
    } else if (fileFormat == 'tab') {
      this.generateTAB(this.imageListService.imageList);
    } else if (fileFormat == 'xml') {
      this.generateXML(this.imageListService.imageList);
    } else if (fileFormat == 'txt') {
      this.generateTXT(this.imageListService.imageList);
    }
  }

  generateDOCX(imageFiles: ImageData[], filename: string = 'image-descriptions.docx'): void {
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
      this.initiateDownload(blob, filename);
    });
  }

  generateDOCXTable(imageFiles: ImageData[], filename: string = 'image-descriptions.docx'): void {
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

  generateXML(imageFiles: ImageData[], filename: string = 'image-descriptions.xml'): void {
    const data = this.convertToXML(imageFiles);
    const blob = new Blob([data], { type: 'application/xml;charset=UTF-8' });
    this.initiateDownload(blob, filename);
  }

  generateTXT(imageFiles: ImageData[], filename: string = 'image-descriptions.txt'): void {
    let data = '';
    imageFiles.forEach((imageObj: ImageData) => {
      const description = this.getActiveDescription(imageObj)?.description ?? '';
      data += imageObj.filename + '\n';
      data += description + '\n\n';
      data += '---------------------------------------\n\n';
    });
    const blob = new Blob([data], { type: 'text/plain;charset=UTF-8' });
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

  private convertToXML(imageFiles: ImageData[]): string {
    let contentStr = '<?xml version="1.0" encoding="UTF-8"?>\r\n';
    contentStr += '<imageToText>\r\n';

    let imageCounter = 0;
    imageFiles.forEach((imageObj: ImageData) => {
      imageCounter += 1;
      let description = this.getActiveDescription(imageObj)?.description ?? '';
      description = description.replaceAll('"', '”').replaceAll('\r', '').replaceAll('\n', '\r\n');
      contentStr += '\t<pb n="' + imageCounter + '" facs="' + imageObj.filename + '"/>\r\n';
      contentStr += '\t<p>\r\n';
      contentStr += '\t\t<lb break="line"/>' + description.replaceAll('\r\n', '\r\n\t\t<lb break="line"/>');
      contentStr += '\r\n\t</p>\r\n';
    });
    contentStr += '</imageToText>\r\n';
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
}
