import { Component } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';

import { SettingsService } from '../../services/settings.service';
import { Model } from '../../types/model.types';

@Component({
    selector: 'settings-form',
    imports: [
        AsyncPipe,
        FormsModule,
        MatExpansionModule,
        MatFormFieldModule,
        MatSelectModule,
        MatSliderModule,
        MatSlideToggleModule
    ],
    templateUrl: './settings-form.component.html',
    styleUrl: './settings-form.component.scss'
})
export class SettingsFormComponent {
  descLengthMax: number = 300;
  descLengthMin: number = 150;
  temperatureMax: number = 2.0;
  temperatureMin: number = 0.0;

  constructor(public settings: SettingsService) {}

  setDescLength(length: number): void {
    this.settings.updateSelectedDescLength(length);
  }

  setIncludeFilename(event: MatSlideToggleChange): void {
    this.settings.updateIncludeFilename(event.checked);
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
