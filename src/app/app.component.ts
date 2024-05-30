import { AfterViewInit, ChangeDetectorRef, Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
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

import { prompts } from '../assets/config/prompts';
import { ApiKeyFormComponent } from './components/api-key-form/api-key-form.component';
import { ConfirmActionDialogComponent } from './components/confirm-action-dialog/confirm-action-dialog.component';
import { FileInputComponent } from './components/file-input/file-input.component';
import { HeaderComponent } from './components/header/header.component';
import { SettingsFormComponent } from './components/settings-form/settings-form.component';
import { CharacterCountPipe } from './pipes/character-count.pipe';
import { ExportService } from './services/export.service';
import { OpenAiService } from './services/openai.service';
import { SettingsService } from './services/settings.service';
import { DescriptionData } from './types/description-data.types';
import { ImageData } from './types/image-data.types';
import { Model } from './types/model.types';
import { Prompt, PromptOption } from './types/prompt.types';
import { RequestSettings } from './types/settings.types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe,
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    RouterOutlet,
    ClipboardModule,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSliderModule,
    MatSlideToggleModule,
    MatStepperModule,
    MatTableModule,
    MatTooltipModule,
    ApiKeyFormComponent,
    FileInputComponent,
    HeaderComponent,
    SettingsFormComponent,
    CharacterCountPipe
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit {
  addImagesIdCounter: number = 0;
  addImagesProcessedCount: number = 0;
  addImagesProgress: number = 0;
  addImagesTotalFiles: number = 0;
  addingImages: boolean = false;
  apiKeyFormGroup!: FormGroup;
  currentPaginatorSize: number = 10;
  generating: boolean = false;
  imageFiles: ImageData[] = [];
  selectedExportFormat: string = 'docx';
  totalCost: number = 0;

  displayedColumns: string[] = ['imagePreview', 'description', 'actions'];
  dataSource = new MatTableDataSource<ImageData>(this.imageFiles);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  constructor(
    public dialog: MatDialog,
    private matIconReg: MatIconRegistry,
    private _snackBar: MatSnackBar,
    private exportService: ExportService,
    private openaiService: OpenAiService,
    public settings: SettingsService,
    private cdRef: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    // Set Angular Material to use the new Material Symbols icon font
    this.matIconReg.setDefaultFontSetClass('material-symbols-outlined');
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  addImageFiles(files: File[]): void {
    if (files.length) {
      this.addImagesProcessedCount = 0;
      this.addImagesTotalFiles = files.length;
      this.addImagesProgress = 0;
      this.addingImages = true;
      const processedFiles: ImageData[] = [];

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

  async generateImageDescription(imageObj: ImageData) {
    imageObj.generating = true;
    this.generating = true;
    const settings: RequestSettings = this.settings.getSettings();
    const promptTemplate: string = this.constructPromptTemplate();
    const prompt: string = this.constructPrompt(promptTemplate, imageObj);

    try {
      const response = await this.openaiService.describeImage(settings, prompt, imageObj.base64Image);
      // console.log(response);

      const respContent = response?.choices?.[0]?.message?.content ?? '';
      if (!respContent && response?.error) {
        const e = response.error;
        const eMessage = `Error communicating with the ${this.settings.selectedModel?.provider} API: ${e.status} ${e.message}`;
        this.showAPIErrorMessage(eMessage);
      } else {
        const cost = this.calculateCostFromResponse(settings.model, response?.usage);
        this.totalCost += cost;
        const newDescription: DescriptionData = {
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
      this.showAPIErrorMessage(`An unknown error occurred while communicating with the ${this.settings.selectedModel?.provider} API.`);
    } finally {
      imageObj.generating = false;
      this.generating = false;
    }
  }

  async generateImageDescriptionsAll() {
    this.generating = true;
    const settings: RequestSettings = this.settings.getSettings();
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
          const eMessage = `Error communicating with the ${this.settings.selectedModel?.provider} API: ${e.status} ${e.message}`;
          this.showAPIErrorMessage(eMessage);
          this.generating = false;
        } else {
          const cost = this.calculateCostFromResponse(settings.model, response?.usage);
          this.totalCost += cost;
          const newDescription: DescriptionData = {
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
        this.showAPIErrorMessage(`An unknown error occurred while communicating with the ${this.settings.selectedModel?.provider} API.`);
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

  previousDescription(imageObj: ImageData) {
    if (imageObj.activeDescriptionIndex > 0) {
      imageObj.activeDescriptionIndex--;
    }
  }

  nextDescription(imageObj: ImageData) {
    if (imageObj.activeDescriptionIndex < imageObj.descriptions.length - 1) {
      imageObj.activeDescriptionIndex++;
    }
  }

  deleteDescription(imageObj: ImageData) {
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

  setApiKeyFormGroup(formGroup: FormGroup) {
    // Wrap the updating of the form group in ngZone and manually
    // trigger change detection to avoid
    // `ExpressionChangedAfterItHasBeenCheckedError`
    this.ngZone.run(() => {
      this.apiKeyFormGroup = formGroup;
      this.cdRef.detectChanges(); // Manually trigger change detection
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

  private updateDataSource(): void {
    this.dataSource.data = [...this.imageFiles];
  }

  private scrollToTableTop(): void {
    // Timeout necessary for the table data to be updated before scrolling window.
    setTimeout(() => {
      const tableElement = document.querySelector('#generate-step-title');
      if (tableElement) {
        const y = Math.floor(
          tableElement.getBoundingClientRect().top
        );
        window.scrollBy({top: y, behavior: 'smooth'});
      }
    }, 500);
  }

  private constructPromptTemplate(): string {
    let promptTemplate: string = '';
    const promptData: Prompt | undefined = prompts.find(p => p.languageCode === this.settings.selectedLanguage);
    if (promptData) {
      const selectedPromptOption = promptData.promptOptions.find((t: PromptOption) => t.type === this.settings.selectedPromptTemplate);
      promptTemplate = selectedPromptOption?.prompt ?? '';
      if (this.settings.includeFilename && promptTemplate) {
        promptTemplate = promptTemplate + ' ' + promptData.filenamePrompt;
      }
    }
    return promptTemplate;
  }

  private constructPrompt(prontTemplate: string, imageObj: any): string {
    let prompt: string = prontTemplate.replaceAll('{{DESC_LENGTH}}', String(this.settings.selectedDescLength));
    if (this.settings.includeFilename && prompt) {
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

}
