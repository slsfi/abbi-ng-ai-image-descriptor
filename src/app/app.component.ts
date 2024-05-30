import { AfterViewInit, ChangeDetectorRef, Component, NgZone, OnInit, ViewChild } from '@angular/core';
import { AsyncPipe, DecimalPipe, NgIf } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { prompts } from '../assets/config/prompts';
import { AddImagesComponent } from './components/add-images/add-images.component';
import { ApiKeyFormComponent } from './components/api-key-form/api-key-form.component';
import { ConfirmActionDialogComponent } from './components/confirm-action-dialog/confirm-action-dialog.component';
import { FileInputComponent } from './components/file-input/file-input.component';
import { HeaderComponent } from './components/header/header.component';
import { SettingsFormComponent } from './components/settings-form/settings-form.component';
import { CharacterCountPipe } from './pipes/character-count.pipe';
import { ExportService } from './services/export.service';
import { ImageListService } from './services/image-list.service';
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
    NgIf,
    FormsModule,
    ReactiveFormsModule,
    RouterOutlet,
    ClipboardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatStepperModule,
    MatTableModule,
    MatTooltipModule,
    AddImagesComponent,
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
  addingImages: boolean = false;
  apiKeyFormGroup!: FormGroup;
  currentPaginatorSize: number = 10;
  generating: boolean = false;
  selectedExportFormat: string = 'docx';
  totalCost: number = 0;

  displayedColumns: string[] = ['imagePreview', 'description', 'actions'];
  dataSource = new MatTableDataSource<ImageData>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  constructor(
    public dialog: MatDialog,
    private matIconReg: MatIconRegistry,
    private _snackBar: MatSnackBar,
    private exportService: ExportService,
    public imageListService: ImageListService,
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

    for (const imageObj of this.imageListService.imageList) {
      if (!this.generating) {
        // Generation has been stopped by user
        break;
      }

      counter++;
      snackBarRef?.dismiss();
      snackBarRef = this._snackBar.open('Generating image description ' + counter + '/' + this.imageListService.imageList.length, 'Stop');
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

  removeImage(imageObj: ImageData): void {
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
        this.imageListService.removeImage(imageObj);
        this.updateDataSource();
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
        this.imageListService.updateImageList([]);
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

  setApiKeyFormGroup(formGroup: FormGroup): void {
    // Wrap the updating of the form group in ngZone and manually
    // trigger change detection to avoid
    // `ExpressionChangedAfterItHasBeenCheckedError`
    this.ngZone.run(() => {
      this.apiKeyFormGroup = formGroup;
      this.cdRef.detectChanges(); // Manually trigger change detection
    });
  }

  setAddingImages(status: boolean): void {
    this.addingImages = status;
  }

  export(): void {
    if (this.selectedExportFormat == 'docx') {
      this.exportService.generateDOCX(this.imageListService.imageList);
    } else if (this.selectedExportFormat == 'csv') {
      this.exportService.generateCSV(this.imageListService.imageList);
    } else if (this.selectedExportFormat == 'tab') {
      this.exportService.generateTAB(this.imageListService.imageList);
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
    this.dataSource.data = [...this.imageListService.imageList];
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
