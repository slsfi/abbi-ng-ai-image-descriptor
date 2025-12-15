import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { UpperFirstLetterPipe } from '../../pipes/upper-first-letter.pipe';
import { SettingsService } from '../../services/settings.service';
import { Model } from '../../types/model.types';
import { taskTypeLabels } from '../../types/prompt.types';

@Component({
  selector: 'settings-form',
  imports: [
    AsyncPipe,
    FormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatTooltipModule,
    UpperFirstLetterPipe
  ],
  templateUrl: './settings-form.component.html',
  styleUrl: './settings-form.component.scss'
})
export class SettingsFormComponent {
  settings = inject(SettingsService);

  taskLabels = taskTypeLabels;

  descLengthMax: number = 300;
  descLengthMin: number = 150;
  temperatureMax: number = 2.0;
  temperatureMin: number = 0.0;

  setDescLength(length: number): void {
    this.settings.updateSelectedDescLength(length);
  }

  setIncludeFilename(event: MatSlideToggleChange): void {
    this.settings.updateIncludeFilename(event.checked);
  }

  setTranscribeHeaders(event: MatSlideToggleChange): void {
    this.settings.updateSelectedTranscribeHeaders(event.checked);
  }

  setLanguage(language: string): void {
    this.settings.updateSelectedLanguage(language);
  }

  setModel(model: Model): void {
    this.settings.updateSelectedModel(model);
  }

  setPromptTemplateType(type: string): void {
    this.settings.updateSelectedPromptTemplate(type);
  }

  setTemperature(temperature: number): void {
    this.settings.updateSelectedTemperature(temperature);
  }

}
