import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle
} from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';

import { ImageData } from '../../types/image-data.types';
import { Prompt } from '../../types/prompt.types';
import { prompts } from '../../../assets/config/prompts';

@Component({
    selector: 'translate-description-dialog',
    imports: [
        FormsModule,
        MatButtonModule,
        MatDialogActions,
        MatDialogClose,
        MatDialogContent,
        MatDialogTitle,
        MatRadioModule
    ],
    templateUrl: './translate-description-dialog.component.html',
    styleUrl: './translate-description-dialog.component.scss'
})
export class TranslateDescriptionDialogComponent implements OnInit {
  translateLanguages: any[] = [];
  selectedLanguageCode: string = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public imageObj: ImageData
  ) {}

  ngOnInit(): void {
    const currentLanguage = this.imageObj.descriptions[this.imageObj.activeDescriptionIndex].language;

    // Filter out the source language
    prompts.forEach((prompt: Prompt) => {
      if (prompt.languageCode !== currentLanguage) {
        this.translateLanguages.push({
          languageCode: prompt.languageCode,
          languageDisplayName: prompt.languageDisplayName
        });

        // Set the default selected language to the first language in the list
        if (!this.selectedLanguageCode) {
          this.selectedLanguageCode = prompt.languageCode;
        }
      }
    });
  }
}
