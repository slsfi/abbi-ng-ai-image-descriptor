import { Component, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { merge } from 'rxjs';

import { models } from '../assets/models';
import { Model, Models } from './types/modelTypes';
import { FileInputComponent } from './components/file-input/file-input.component';
import { OpenaiService } from './services/openai.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterOutlet, ClipboardModule, MatButtonModule, MatCardModule, MatIconModule, MatInputModule, MatFormFieldModule, MatProgressBarModule, MatProgressSpinnerModule, MatSelectModule, MatSliderModule, FileInputComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  addImagesProgress: number = 0;
  addingImages: boolean = false;
  apiError: boolean = false;
  apiKey: string = '';
  availableModels: Models = [];
  descLengthMax: number = 450;
  descLengthMin: number = 150;
  generating: boolean = false;
  hideApiKey: boolean = true;
  imageFiles: any[] = [];
  selectedDescLength: number = 300;
  selectedLanguage: string = 'sv';
  selectedModel: Model | null = null;
  selectedPromptTemplate: string = 'altText';

  apiKeyFC: FormControl = new FormControl('', [Validators.required]);
  apiKeyErrorMessage: string = '';
  
  constructor(
    private openaiService: OpenaiService
  ) {
    this.availableModels = models;
    // Set preselected model to first of available models with default property set to true
    this.selectedModel = this.availableModels.filter((model) => model.default)[0];

    merge(this.apiKeyFC.statusChanges, this.apiKeyFC.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.updateApiKeyErrorMessage());
  }

  ngOnInit() {

  }

  loadApiKeyFromFile(files: File[]): void {
    if (files.length) {
      this.apiError = false;
      const file: File = files[0];
      this.setApiKeyFromFile(file);
    } else {
      this.apiError = true;
    }
  }

  addImageFiles(files: File[]): void {
    if (files.length) {
      this.addImagesProgress = 0;
      this.addingImages = true;
      // Initialize a counter for processed files
      let processedFilesCount = 0;
      const totalFiles = files.length;
      const processedFiles: any[] = [];

      // Process the selected files
      const promises = Array.from(files).map((file, index) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          const reader = new FileReader();

          reader.onload = (e: any) => {
            img.src = e.target.result;
            img.onload = () => {
              const resizedImgDetails = this.resizeImage(img);
              processedFiles[index] = {
                filename: file.name,
                base64Image: resizedImgDetails.base64,
                height: resizedImgDetails.height,
                width: resizedImgDetails.width,
                description: '',
                generating: false
              };
              
              // Increment the counter and update the progress bar
              processedFilesCount++;
              this.addImagesProgress = Math.round((processedFilesCount / totalFiles) * 100);

              resolve();
            };
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(() => {
        // Optionally, you can handle further actions after all images are processed
        this.imageFiles.push(...processedFiles);
        this.addingImages = false;
        console.log('All images have been processed and added in order.');
      });
    }
  }

  async generateImageDescription(imageObj: any) {
    this.apiError = false;
    imageObj.generating = true;
    this.generating = true;
    const response = await this.openaiService.describeImage(imageObj.base64Image);
    imageObj.generating = false;
    this.generating = false;
    const respContent = response?.choices?.[0]?.message?.content ?? null;
    if (!respContent) {
      this.apiError = true;
    }
    imageObj.description = respContent ?? '';
  }

  private setApiKeyFromFile(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      let key = String(reader.result);
      this.updateApiKey(null, key.trim());
      // this.apiKey = key.trim();
    };
    reader.readAsText(file);
  }

  private resizeImage(img: HTMLImageElement): any {
    // Resize image to fit into the image dimension requirements of the high-detail
    // setting of OpenAI's vision models.
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const shortSideMax = 768; // the maximum length of the short side of the image
    const longSideMax = 2048; // the maximum length of the long side of the image
    let newWidth = img.naturalWidth;
    let newHeight = img.naturalHeight;

    if (newWidth > newHeight) {
      // Width is the larger dimension or they are equal
      // First resize to fit into a 2048 px square
      if (newWidth > longSideMax) {
        newWidth = longSideMax;
        newHeight = longSideMax * aspectRatio;
      }
      // Then resize so the short side is within maximum
      if (newHeight > shortSideMax) {
        newHeight = shortSideMax;
        newWidth = shortSideMax * aspectRatio;
      }
    } else {
      // Height is the larger dimension
      // First resize to fit into a 2048 px square
      if (newHeight > longSideMax) {
        newHeight = longSideMax;
        newWidth = longSideMax / aspectRatio;
      }
      // Then resize so the short side is within maximum
      if (newWidth > shortSideMax) {
        newWidth = shortSideMax;
        newHeight = shortSideMax / aspectRatio;
      }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx!.drawImage(img, 0, 0, newWidth, newHeight);
    const imgDetails = {
      base64: canvas.toDataURL('image/jpeg'),
      height: newHeight,
      width: newWidth
    }
    return imgDetails;
  }

  updateApiKey(event: any, key?: string) {
    const newKey = key ? key : event?.target?.value ?? '';

    if (newKey) {
      if (newKey !== this.apiKey) {
        this.openaiService.updateClient(newKey);
      }
    }

    this.apiKey = newKey;
  }

  updateApiKeyErrorMessage() {
    if (this.apiKeyFC.hasError('required')) {
      this.apiKeyErrorMessage = 'You must enter an API key';
    } else {
      this.apiKeyErrorMessage = '';
    }
  }

  removeImage(imageObj: any) {
    let indexToRemove = -1;
    for (let i = 0; i < this.imageFiles.length; i++) {
      if (imageObj.filename == this.imageFiles[i].filename) {
        indexToRemove = i;
        break;
      }
    }

    if (indexToRemove > -1 && indexToRemove < this.imageFiles.length) {
      this.imageFiles.splice(indexToRemove, 1);
    }
  }

}
