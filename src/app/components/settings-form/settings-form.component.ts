import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PricePerMTokensPipe } from '../../pipes/price-per-m-tokens.pipe';
import { UpperFirstLetterPipe } from '../../pipes/upper-first-letter.pipe';
import { SettingsService } from '../../services/settings.service';
import { Model } from '../../types/model.types';
import { TaskTypeId } from '../../../assets/config/prompts';

@Component({
  selector: 'settings-form',
  imports: [
    FormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatTooltipModule,
    PricePerMTokensPipe,
    UpperFirstLetterPipe
  ],
  templateUrl: './settings-form.component.html',
  styleUrl: './settings-form.component.scss'
})
export class SettingsFormComponent {
  settings = inject(SettingsService);

  teiEncode = signal<boolean>(false);
  transcribeHeaders = signal<boolean>(true);

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

  setTeiEncode(event: MatSlideToggleChange): void {
    this.settings.updateTeiEncode(event.checked);
  }

  setTranscribeHeaders(event: MatSlideToggleChange): void {
    if (event.checked) {
      this.settings.updateSelectedVariantId('default');
      this.transcribeHeaders.set(true);
    } else {
      this.settings.updateSelectedVariantId('noHeaders');
      this.transcribeHeaders.set(false);
    }
  }

  setTaskVariant(id: string): void {
    this.settings.updateSelectedVariantId(id);
  }

  setModel(model: Model): void {
    this.settings.updateSelectedModel(model);
  }

  setTaskType(type: TaskTypeId): void {
    this.settings.updateSelectedTaskType(type);
  }

  setTemperature(temperature: number): void {
    this.settings.updateSelectedTemperature(temperature);
  }

}
