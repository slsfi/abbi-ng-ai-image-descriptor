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
      sections: [{
        properties: {},
        children: imageFiles.map((imageObj: imageData) => {
          const descriptionObj = this.getActiveDescription(imageObj);
            return new Paragraph({
              children: [
                new TextRun(imageObj.filename + ': ' + (descriptionObj?.description ?? ''))
              ],
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
    const csvData = this.convertToCSV(imageFiles);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
    this.initiateDownload(blob, filename);
  }

  generateTAB(imageFiles: imageData[], filename: string = 'image-descriptions.tab'): void {
    let dataString = '';
    imageFiles.forEach((imageObj: imageData) => {
      const descriptionObj = this.getActiveDescription(imageObj);
      const row = imageObj.filename + '\t' + (descriptionObj?.description ?? '') + '\n';
      dataString += row;
    });
    const blob = new Blob([dataString], { type: 'text/tab-separated-values;charset=utf-8' });
    this.initiateDownload(blob, filename);
  }

  private convertToCSV(data: any[]): string {
    const array = [Object.keys(data[0])].concat(data);
    return array.map(row => this.convertRowToCSV(row)).join('\n');
  }

  private convertRowToCSV(row: any): string {
    return Object.values(row).map(value => this.escapeCSVValue(value)).join(',');
  }

  private escapeCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    let valueStr = value.toString();
    if (valueStr.includes(',') || valueStr.includes('\n') || valueStr.includes('"')) {
      valueStr = `"${valueStr.replace(/"/g, '""')}"`;
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
