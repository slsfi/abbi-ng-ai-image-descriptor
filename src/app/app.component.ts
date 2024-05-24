import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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
import { catchError, debounceTime, Observable, of, switchMap } from 'rxjs';

import { models } from '../assets/config/models';
import { prompts } from '../assets/config/prompts';
import { ConfirmActionDialogComponent } from './components/confirm-action-dialog/confirm-action-dialog.component';
import { FileInputComponent } from './components/file-input/file-input.component';
import { CharacterCountPipe } from './pipes/character-count.pipe';
import { OpenAiService } from './services/openai.service';
import { Model, Models } from './types/model.types';
import { Prompt, PromptOption } from './types/prompt.types';
import { RequestSettings } from './types/settings.types';

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
  apiKeyValidationMessage: string | null = null;
  availableModels: Models = [];
  descLengthMax: number = 450;
  descLengthMin: number = 150;
  generating: boolean = false;
  hideApiKey: boolean = true;
  imageFiles: any[] = [];
  includeFilename: boolean = true;
  languages: any[] = [];
  promptTemplates: any[] = [];
  selectedDescLength: number = 300;
  selectedLanguage: string = 'sv';
  selectedModel: Model | null = null;
  selectedPromptTemplate: string = 'Alt text';
  selectedTemperature: number = 1.0;
  temperatureMax: number = 2.0;
  temperatureMin: number = 0.0;

  apiKeyErrorMessage: string = '';

  apiKeyFormGroup = this._formBuilder.group({
    apiKeyFC: new FormControl('', {
      validators: [Validators.required],
      asyncValidators: [this.apiKeyValidator.bind(this)],
      updateOn: 'blur' // Run async validator when the control loses focus
    })
  });
  
  constructor(
    public dialog: MatDialog,
    private _formBuilder: FormBuilder,
    private _snackBar: MatSnackBar,
    private openaiService: OpenAiService
  ) {
    this.availableModels = models;
    // Set preselected model to first of available models with
    // default property set to true
    this.selectedModel = this.availableModels.filter((model) => model.default)[0];
  }

  ngOnInit() {
    // Get the available languages from prompts array
    this.languages = prompts.map(p => ({ code: p.languageCode, name: p.languageDisplayName }));
    this.initializePromptTemplates();

    // Update the API key and OpenAI client in the OpenaiService
    // when the value of the API key form field changes and the
    // entered key is valid.
    this.apiKeyFC?.statusChanges.subscribe(status => {
      if (this.apiKeyFC?.value) {
        if (status === 'PENDING') {
          this.apiKeyValidationMessage = 'Validating API key ...';
        } else if (status === 'VALID') {
          this.apiKeyValidationMessage = 'The API key is valid.';
          this.openaiService.updateClient(this.apiKeyFC.value as string);
        } else {
          this.apiKeyValidationMessage = null;
        }
      }
    });
  }

  private initializePromptTemplates() {
    const defaultLanguagePrompt = prompts.find(p => p.languageCode === this.selectedLanguage);
    if (defaultLanguagePrompt) {
      this.promptTemplates = defaultLanguagePrompt.promptOptions;
      const defaultTemplate = defaultLanguagePrompt.promptOptions.find(t => t.type === 'Alt text');
      this.selectedPromptTemplate = defaultTemplate ? 'Alt text' : defaultLanguagePrompt.promptOptions[0].type;
    }
  }

  onLanguageChange() {
    const selectedPrompt = prompts.find(p => p.languageCode === this.selectedLanguage);
    if (selectedPrompt) {
      this.promptTemplates = selectedPrompt.promptOptions;
      const defaultTemplate = selectedPrompt.promptOptions.find(t => t.type === 'Alt text');
      this.selectedPromptTemplate = defaultTemplate ? 'Alt text' : selectedPrompt.promptOptions[0].type;
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
    const promptTemplate: string = this.constructPromptTemplate();
    const prompt: string = this.constructPrompt(promptTemplate, imageObj);

    const response = await this.openaiService.describeImage(settings, prompt, imageObj.base64Image);
    console.log(response);
    const respContent = response?.choices?.[0]?.message?.content ?? null;
    if (!respContent) {
      this.apiError = true;
    }
    imageObj.description = respContent ?? '';

    imageObj.generating = false;
    this.generating = false;
  }

  async generateImageDescriptionsAll() {
    this.apiError = false;
    this.generating = true;

    const settings: RequestSettings = this.getSettings();
    const promptTemplate: string = this.constructPromptTemplate();

    let snackBarRef = this._snackBar.open('Generating ' + this.imageFiles.length + ' image description' + (this.imageFiles.length > 1 ? 's' : ''), 'Stop');

    snackBarRef.onAction().subscribe(() => {
      this.generating = false;
    });

    for (const imageObj of this.imageFiles) {
      if (!this.generating) {
        // Generation has been stopped by user
        break;
      }
      imageObj.generating = true;
      try {
        const prompt: string = this.constructPrompt(promptTemplate, imageObj);
        const response = await this.openaiService.describeImage(settings, prompt, imageObj.base64Image);
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
      promptTemplate: this.selectedPromptTemplate,
      includeFilename: this.includeFilename
    }
    return settings;
  }

  private constructPromptTemplate(): string {
    let promptTemplate: string = '';
    const promptData: Prompt | null = prompts.find(p => p.languageCode === this.selectedLanguage) || null;
    if (promptData) {
      const selectedPromptOption = promptData.promptOptions.find((t: PromptOption) => t.type === this.selectedPromptTemplate);
      promptTemplate = selectedPromptOption?.prompt ?? '';
      if (this.includeFilename && promptTemplate) {
        promptTemplate = promptTemplate + ' ' + promptData.filenamePrompt;
      }
    }
    return promptTemplate;
  }

  private constructPrompt(prontTemplate: string, imageObj: any): string {
    let prompt: string = prontTemplate.replaceAll('{{DESC_LENGTH}}', String(this.selectedDescLength));
    if (this.includeFilename && prompt) {
      prompt = prompt.replaceAll('{{FILENAME}}', imageObj.filename);
    }
    return prompt;
  }

  loadApiKeyFromFile(files: File[]): void {
    if (files.length) {
      const file: File = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const newKey = String(reader.result).trim();
        this.apiKeyFormGroup.patchValue({apiKeyFC: newKey});
      };
      reader.readAsText(file);
    }
  }

  private apiKeyValidator(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value) {
      return of(null);
    }
    return this.openaiService.isValidApiKey(control.value).pipe(
      debounceTime(500),
      switchMap(isValid => {
        return isValid ? of(null) : of({ invalidApiKey: true });
      }),
      catchError(() => of({ invalidApiKey: true }))
    );
  }

  get apiKeyFC() {
    return this.apiKeyFormGroup.get('apiKeyFC');
  }

}
