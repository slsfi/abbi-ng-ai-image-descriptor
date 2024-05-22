import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';

import { models } from '../assets/models';
import { ConfirmActionDialogComponent } from './components/confirm-action-dialog/confirm-action-dialog.component';
import { FileInputComponent } from './components/file-input/file-input.component';
import { CharacterCountPipe } from './pipes/character-count.pipe';
import { OpenaiService } from './services/openai.service';
import { Model, Models } from './types/modelTypes';
import { RequestSettings } from './types/settingsTypes';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterOutlet, ClipboardModule, MatButtonModule, MatExpansionModule, MatIconModule, MatInputModule, MatFormFieldModule, MatProgressBarModule, MatProgressSpinnerModule, MatSelectModule, MatSliderModule, MatSlideToggleModule, MatStepperModule, FileInputComponent, CharacterCountPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  addImagesIdCounter: number = 0;
  addImagesProcessedCount: number = 0;
  addImagesProgress: number = 0;
  addImagesTotalFiles: number = 0;
  addingImages: boolean = false;
  apiError: boolean = false;
  apiKey: string = '';
  availableModels: Models = [];
  descLengthMax: number = 450;
  descLengthMin: number = 150;
  generating: boolean = false;
  hideApiKey: boolean = true;
  imageFiles: any[] = [];
  includeFilename: boolean = true;
  selectedDescLength: number = 300;
  selectedLanguage: string = 'sv';
  selectedModel: Model | null = null;
  selectedPromptTemplate: string = 'altText';
  selectedTemperature: number = 1.0;
  temperatureMax: number = 2.0;
  temperatureMin: number = 0.0;

  apiKeyErrorMessage: string = '';

  apiKeyFormGroup = this._formBuilder.group({
    apiKeyFC: new FormControl(this.apiKey, [Validators.required])
  });
  
  constructor(
    public dialog: MatDialog,
    private _formBuilder: FormBuilder,
    private _snackBar: MatSnackBar,
    private openaiService: OpenaiService
  ) {
    this.availableModels = models;
    // Set preselected model to first of available models with
    // default property set to true
    this.selectedModel = this.availableModels.filter((model) => model.default)[0];
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
      this.addImagesProcessedCount = 0;
      this.addImagesTotalFiles = files.length;
      this.addImagesProgress = 0;
      this.addingImages = true;
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
                id: this.addImagesIdCounter++,
                filename: file.name,
                base64Image: resizedImgDetails.base64,
                height: resizedImgDetails.height,
                width: resizedImgDetails.width,
                description: '',
                generating: false
              };
              
              // Update progress bar
              this.addImagesProcessedCount++;
              this.addImagesProgress = Math.round((this.addImagesProcessedCount / this.addImagesTotalFiles) * 100);

              resolve();
            };
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(() => {
        // Add the added, processed images to the images array
        this.imageFiles.push(...processedFiles);
        this.addingImages = false;
        setTimeout(() => {
          this.addImagesTotalFiles = 0;
          this.addImagesProcessedCount = 0;
          this.addImagesProgress = 0;
        }, 1500);
        
      });
    }
  }

  async generateImageDescription(imageObj: any) {
    this.apiError = false;
    imageObj.generating = true;
    this.generating = true;
    const settings: RequestSettings = this.getSettings();
    const response = await this.openaiService.describeImage(settings, imageObj.base64Image);
    imageObj.generating = false;
    this.generating = false;
    console.log(response);
    const respContent = response?.choices?.[0]?.message?.content ?? null;
    if (!respContent) {
      this.apiError = true;
    }
    imageObj.description = respContent ?? '';
  }

  async generateImageDescriptionsAll() {
    this.apiError = false;
    this.generating = true;

    let snackBarRef = this._snackBar.open('Generating ' + this.imageFiles.length + ' image description' + (this.imageFiles.length > 1 ? 's' : ''), 'Stop');

    snackBarRef.onAction().subscribe(() => {
      this.generating = false;
    });

    const settings: RequestSettings = this.getSettings();

    for (const imageObj of this.imageFiles) {
      if (!this.generating) {
        // Generation has been stopped by user
        break;
      }
      imageObj.generating = true;
      try {
        const response = await this.openaiService.describeImage(settings, imageObj.base64Image);
        console.log(response);
        const respContent = response?.choices?.[0]?.message?.content ?? null;
        if (!respContent) {
          this.apiError = true;
        }
        imageObj.description = respContent ?? '';
        // Handle the response as needed
      } catch (error) {
        this.apiError = true;
        console.error('Error describing image:', error);
        break;
      } finally {
        imageObj.generating = false;
      }
    }
  
    this.generating = false;
    snackBarRef.dismiss();
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

    let canvas: HTMLCanvasElement | null = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx!.drawImage(img, 0, 0, newWidth, newHeight);
    const imgDetails = {
      base64: canvas.toDataURL('image/jpeg'),
      height: newHeight,
      width: newWidth
    }
    canvas = null;
    return imgDetails;
  }

  updateApiKey(event: any, key?: string) {
    const newKey = key ? key : event?.target?.value ?? '';

    if (newKey) {
      if (newKey !== this.apiKey) {
        this.openaiService.updateClient(newKey);
        //this.openaiService.isValidApiKey(newKey);
      }
    }
    this.apiKeyFormGroup.patchValue({apiKeyFC: newKey});
    this.apiKey = newKey;
  }

  /*
  updateApiKeyErrorMessage() {
    if (this.apiKeyFC.hasError('required')) {
      this.apiKeyErrorMessage = 'You must enter an API key';
    } else {
      this.apiKeyErrorMessage = '';
    }
  }
  */

  removeImage(imageObj: any): void {
    const dialogRef = this.dialog.open(ConfirmActionDialogComponent, {
      data: {
        title: 'Remove image?',
        body: 'This action cannot be undone.',
        cancelLabel: 'Cancel',
        confirmLabel: 'Remove'
      },
    });

    dialogRef.afterClosed().subscribe((remove: boolean) => {
      if (remove) {
        let indexToRemove = -1;
        for (let i = 0; i < this.imageFiles.length; i++) {
          if (imageObj.id == this.imageFiles[i].id) {
            indexToRemove = i;
            break;
          }
        }

        if (indexToRemove > -1 && indexToRemove < this.imageFiles.length) {
          this.imageFiles.splice(indexToRemove, 1);
        }
      }
    });
  }

  removeAllImages(): void {
    const dialogRef = this.dialog.open(ConfirmActionDialogComponent, {
      data: {
        title: 'Remove all images?',
        body: 'This action cannot be undone.',
        cancelLabel: 'Cancel',
        confirmLabel: 'Remove'
      },
    });

    dialogRef.afterClosed().subscribe((remove: boolean) => {
      if (remove) {
        this.imageFiles = [];
      }
    });
  }

  private getSettings(): RequestSettings {
    const settings: RequestSettings = {
      model: this.selectedModel,
      temperature: this.selectedTemperature,
      language: this.selectedLanguage,
      maxLength: this.selectedDescLength,
      promptTemplate: this.selectedPromptTemplate
    }
    return settings;
  }

  get apiKeyFC() {
    return this.apiKeyFormGroup.get('apiKeyFC');
  }

}
