import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, debounceTime, Observable, of, switchMap } from 'rxjs';

import { models } from '../assets/config/models';
import { prompts } from '../assets/config/prompts';
import { ConfirmActionDialogComponent } from './components/confirm-action-dialog/confirm-action-dialog.component';
import { FileInputComponent } from './components/file-input/file-input.component';
import { CharacterCountPipe } from './pipes/character-count.pipe';
import { ExportService } from './services/export.service';
import { OpenAiService } from './services/openai.service';
import { descriptionData } from './types/description-data.types';
import { imageData } from './types/image-data.types';
import { Model, Models } from './types/model.types';
import { Prompt, PromptOption } from './types/prompt.types';
import { RequestSettings } from './types/settings.types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DecimalPipe, FormsModule, ReactiveFormsModule, RouterOutlet, ClipboardModule, MatButtonModule, MatExpansionModule, MatIconModule, MatInputModule, MatFormFieldModule, MatPaginatorModule, MatProgressBarModule, MatProgressSpinnerModule, MatSelectModule, MatSliderModule, MatSlideToggleModule, MatStepperModule, MatTableModule, MatTooltipModule, FileInputComponent, CharacterCountPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit {
  addImagesIdCounter: number = 0;
  addImagesProcessedCount: number = 0;
  addImagesProgress: number = 0;
  addImagesTotalFiles: number = 0;
  addingImages: boolean = false;
  apiKeyValidationMessage: string | null = null;
  availableModels: Models = [];
  currentPaginatorSize: number = 10;
  descLengthMax: number = 350;
  descLengthMin: number = 150;
  generating: boolean = false;
  hideApiKey: boolean = true;
  imageFiles: imageData[] = [];
  includeFilename: boolean = true;
  languages: any[] = [];
  promptTemplates: any[] = [];
  selectedDescLength: number = 250;
  selectedExportFormat: string = 'docx';
  selectedLanguage: string = 'sv';
  selectedModel?: Model = undefined;
  selectedPromptTemplate: string = 'Alt text';
  selectedTemperature: number = 1.0;
  temperatureMax: number = 2.0;
  temperatureMin: number = 0.0;
  totalCost: number = 0;

  apiKeyFormGroup = this._formBuilder.group({
    apiKeyFC: new FormControl('', {
      validators: [Validators.required],
      asyncValidators: [this.apiKeyValidator.bind(this)],
      updateOn: 'blur' // Run async validator when the control loses focus
    })
  });

  displayedColumns: string[] = ['imagePreview', 'description', 'actions'];
  dataSource = new MatTableDataSource<imageData>(this.imageFiles);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  constructor(
    public dialog: MatDialog,
    private _formBuilder: FormBuilder,
    private matIconReg: MatIconRegistry,
    private _snackBar: MatSnackBar,
    private exportService: ExportService,
    private openaiService: OpenAiService
  ) {
    this.availableModels = models;
    // Set preselected model to first of available models with
    // default property set to true
    this.selectedModel = this.availableModels.filter((model) => model.default)[0];
  }

  ngOnInit() {
    // Set Angular Material to use the new Material Symbols icon font
    this.matIconReg.setDefaultFontSetClass('material-symbols-outlined');

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

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
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
      const processedFiles: imageData[] = [];

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
                descriptions: [],
                activeDescriptionIndex: 0,
                generating: false
              };
              
              // Update progress bar
              this.addImagesProcessedCount++;
              this.addImagesProgress = (this.addImagesProcessedCount / this.addImagesTotalFiles) * 100.0;

              resolve();
            };
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(() => {
        // Add the added, processed images to the images array
        this.imageFiles.push(...processedFiles);
        this.updateDataSource();
        this.addingImages = false;
        setTimeout(() => {
          this.addImagesTotalFiles = 0;
          this.addImagesProcessedCount = 0;
          this.addImagesProgress = 0;
        }, 1500);
        
      });
    }
  }

  async generateImageDescription(imageObj: imageData) {
    imageObj.generating = true;
    this.generating = true;
    const settings: RequestSettings = this.getSettings();
    const promptTemplate: string = this.constructPromptTemplate();
    const prompt: string = this.constructPrompt(promptTemplate, imageObj);

    try {
      const response = await this.openaiService.describeImage(settings, prompt, imageObj.base64Image);
      // console.log(response);

      const respContent = response?.choices?.[0]?.message?.content ?? '';
      if (!respContent && response?.error) {
        const e = response.error;
        const eMessage = `Error communicating with the ${this.selectedModel?.provider} API: ${e.status} ${e.message}`;
        this.showAPIErrorMessage(eMessage);
      } else {
        const cost = this.calculateCostFromResponse(settings.model, response?.usage);
        this.totalCost += cost;
        const newDescription: descriptionData = {
          description: respContent,
          model: settings.model?.id ?? '',
          inputTokens: response?.usage?.prompt_tokens ?? 0,
          outputTokens: response?.usage?.completion_tokens ?? 0,
          cost: cost
        };
        imageObj.descriptions.push(newDescription);
        imageObj.activeDescriptionIndex = imageObj.descriptions.length - 1;
      }
    } catch (e: any) {
      console.error(e);
      this.showAPIErrorMessage(`An unknown error occurred while communicating with the ${this.selectedModel?.provider} API.`);
    } finally {
      imageObj.generating = false;
      this.generating = false;
    }
  }

  async generateImageDescriptionsAll() {
    this.generating = true;
    const settings: RequestSettings = this.getSettings();
    const promptTemplate: string = this.constructPromptTemplate();

    let snackBarRef = null;
    let counter = 0;

    for (const imageObj of this.imageFiles) {
      if (!this.generating) {
        // Generation has been stopped by user
        break;
      }

      counter++;
      snackBarRef?.dismiss();
      snackBarRef = this._snackBar.open('Generating image description ' + counter + '/' + this.imageFiles.length, 'Stop');
      snackBarRef.onAction().subscribe(() => {
        this.generating = false;
      });

      imageObj.generating = true;
      const prompt: string = this.constructPrompt(promptTemplate, imageObj);

      try {
        const response = await this.openaiService.describeImage(settings, prompt, imageObj.base64Image);
        // console.log(response);

        const respContent = response?.choices?.[0]?.message?.content ?? '';
        if (!respContent && response?.error) {
          const e = response.error;
          const eMessage = `Error communicating with the ${this.selectedModel?.provider} API: ${e.status} ${e.message}`;
          this.showAPIErrorMessage(eMessage);
          this.generating = false;
        } else {
          const cost = this.calculateCostFromResponse(settings.model, response?.usage);
          this.totalCost += cost;
          const newDescription: descriptionData = {
            description: respContent,
            model: settings.model?.id ?? '',
            inputTokens: response?.usage?.prompt_tokens ?? 0,
            outputTokens: response?.usage?.completion_tokens ?? 0,
            cost: cost
          };
          imageObj.descriptions.push(newDescription);
          imageObj.activeDescriptionIndex = imageObj.descriptions.length - 1;
        }
      } catch (e: any) {
        console.error(e);
        this.showAPIErrorMessage(`An unknown error occurred while communicating with the ${this.selectedModel?.provider} API.`);
        this.generating = false;
      } finally {
        imageObj.generating = false;
      }
    }
  
    this.generating = false;
    snackBarRef?.dismiss();
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
          this.updateDataSource();
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
        this.updateDataSource();
      }
    });
  }

  previousDescription(imageObj: imageData) {
    if (imageObj.activeDescriptionIndex > 0) {
      imageObj.activeDescriptionIndex--;
    }
  }

  nextDescription(imageObj: imageData) {
    if (imageObj.activeDescriptionIndex < imageObj.descriptions.length - 1) {
      imageObj.activeDescriptionIndex++;
    }
  }

  deleteDescription(imageObj: imageData) {
    const dialogRef = this.dialog.open(ConfirmActionDialogComponent, {
      data: {
        title: 'Delete this description?',
        body: 'This action cannot be undone.',
        cancelLabel: 'Cancel',
        confirmLabel: 'Delete'
      },
    });

    dialogRef.afterClosed().subscribe((remove: boolean) => {
      if (remove) {
        if (imageObj.descriptions.length > 0) {
          const indexToRemove = imageObj.activeDescriptionIndex;
          if (indexToRemove > -1 && indexToRemove < imageObj.descriptions.length) {
            imageObj.descriptions.splice(indexToRemove, 1);
            imageObj.activeDescriptionIndex = indexToRemove < 1 ? 0 : (indexToRemove > imageObj.descriptions.length - 1 ? indexToRemove - 1 : indexToRemove);
          }
        }
      }
    });
  }

  export(): void {
    if (this.selectedExportFormat == 'docx') {
      this.exportService.generateDOCX(this.imageFiles);
    } else if (this.selectedExportFormat == 'csv') {
      this.exportService.generateCSV(this.imageFiles);
    } else if (this.selectedExportFormat == 'tab') {
      this.exportService.generateTAB(this.imageFiles);
    }
  }

  private updateDataSource(): void {
    this.dataSource.data = [...this.imageFiles];
  }

  /**
   * When the page changes in the table paginator, scroll window to top of table.
   */
  onPageChange(event: PageEvent): void {
    if (event.pageSize !== this.currentPaginatorSize) {
      this.currentPaginatorSize = event.pageSize;
    } else {
      this.scrollToTableTop();
    }
  }

  private scrollToTableTop(): void {
    // Timeout necessary for the table data to be updated before scrolling window.
    setTimeout(() => {
      const tableElement = document.querySelector('.table-wrapper');
      if (tableElement) {
        const y = Math.floor(
          tableElement.getBoundingClientRect().top
        );
        window.scrollBy({top: y, behavior: 'smooth'});
      }
    }, 500);
  }

  private getSettings(): RequestSettings {
    const settings: RequestSettings = {
      model: this.selectedModel,
      temperature: this.selectedTemperature,
      language: this.selectedLanguage,
      descriptionLength: this.selectedDescLength,
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

  private calculateCostFromResponse(model?: Model, usage?: any): number {
    if (model && usage) {
      const inputCost: number = ((usage.prompt_tokens ?? 0) / 1000000.0) * model.inputPrice;
      const outputCost: number = ((usage.completion_tokens ?? 0) / 1000000.0) * model.outputPrice;
      return inputCost + outputCost;
    } else {
      return 0;
    }
  }

  private showAPIErrorMessage(message: string): void {
    const snackBarRef = this._snackBar.open(message, 'Dismiss', {
      duration: 5000
    });
    snackBarRef?.onAction().subscribe(() => {
      snackBarRef.dismiss();
    });
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
