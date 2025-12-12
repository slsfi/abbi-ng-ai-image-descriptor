import { AfterViewInit, Component, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { prompts } from '../../../assets/config/prompts';
import { ConfirmActionDialogComponent } from '../confirm-action-dialog/confirm-action-dialog.component';
import { EditDescriptionDialogComponent } from '../edit-description-dialog/edit-description-dialog.component';
import { ExportDialogComponent } from '../export-dialog/export-dialog.component';
import { TranslateDescriptionDialogComponent } from '../translate-description-dialog/translate-description-dialog.component';
import { CharacterCountPipe } from '../../pipes/character-count.pipe';
import { ExportService } from '../../services/export.service';
import { ImageListService } from '../../services/image-list.service';
import { OpenAiService } from '../../services/openai.service';
import { SettingsService } from '../../services/settings.service';
import { DescriptionData } from '../../types/description-data.types';
import { ImageData } from '../../types/image-data.types';
import { Model } from '../../types/model.types';
import { Prompt, PromptOption } from '../../types/prompt.types';
import { RequestSettings } from '../../types/settings.types';

@Component({
  selector: 'generate-descriptions',
  imports: [
    AsyncPipe,
    DecimalPipe,
    FormsModule,
    ClipboardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatPaginator,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    CharacterCountPipe
],
  templateUrl: './generate-descriptions.component.html',
  styleUrl: './generate-descriptions.component.scss'
})
export class GenerateDescriptionsComponent implements AfterViewInit, OnInit {
  private destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly exportService = inject(ExportService);
  public readonly imageListService = inject(ImageListService);
  private readonly openaiService = inject(OpenAiService);
  private readonly settings = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);

  currentPaginatorSize: number = 10;
  matTableDataSource = new MatTableDataSource<ImageData>([]);
  displayedColumns: string[] = ['imagePreview', 'description', 'actions'];
  exporting: boolean = false;
  generating: boolean = false;
  totalCost: number = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    // Subscribe to the image list in the service to update the data source
    // for the Material table.
    this.imageListService.imageList$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(
      (imageList: ImageData[]) => {
        this.matTableDataSource.data = imageList;
      }
    );
  }

  ngAfterViewInit(): void {
    this.matTableDataSource.paginator = this.paginator;
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

      const respContent = response?.output_text ?? '';
      if (!respContent && response?.error) {
        const e = response.error;
        const eMessage = `Error communicating with the ${this.settings.selectedModel?.provider} API: ${e.message}`;
        this.showAPIErrorMessage(eMessage);
      } else {
        const cost = this.calculateCostFromResponse(settings.model, response?.usage);
        this.totalCost += cost;
        const newDescription: DescriptionData = {
          description: respContent,
          language: settings.language,
          model: settings.model?.id ?? '',
          inputTokens: response?.usage?.input_tokens ?? 0,
          outputTokens: response?.usage?.output_tokens ?? 0,
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
      snackBarRef = this.snackBar.open('Generating image description ' + counter + '/' + this.imageListService.imageList.length, 'Stop');
      snackBarRef.onAction().subscribe(() => {
        this.generating = false;
      });

      imageObj.generating = true;
      const prompt: string = this.constructPrompt(promptTemplate, imageObj);

      try {
        const response = await this.openaiService.describeImage(settings, prompt, imageObj.base64Image);
        // console.log(response);

        const respContent = response?.output_text ?? '';
        if (!respContent && response?.error) {
          const e = response.error;
          const eMessage = `Error communicating with the ${this.settings.selectedModel?.provider} API: ${e.message}`;
          this.showAPIErrorMessage(eMessage);
          this.generating = false;
        } else {
          const cost = this.calculateCostFromResponse(settings.model, response?.usage);
          this.totalCost += cost;
          const newDescription: DescriptionData = {
            description: respContent,
            language: settings.language,
            model: settings.model?.id ?? '',
            inputTokens: response?.usage?.input_tokens ?? 0,
            outputTokens: response?.usage?.output_tokens ?? 0,
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

  async generateDescriptionTranslation(imageObj: ImageData, prompt: string, targetLanguageCode: string) {
    imageObj.generating = true;
    this.generating = true;
    const settings: RequestSettings = this.settings.getSettings();

    try {
      const response = await this.openaiService.responsesTextTask(settings, prompt);
      // console.log(response);

      const respContent = response?.output_text ?? '';
      if (!respContent && response?.error) {
        const e = response.error;
        const eMessage = `Error communicating with the ${settings.model?.provider} API: ${e.code} ${e.message}`;
        this.showAPIErrorMessage(eMessage);
      } else {
        const cost = this.calculateCostFromResponse(settings.model, response?.usage);
        this.totalCost += cost;
        const newDescription: DescriptionData = {
          description: respContent,
          language: targetLanguageCode,
          model: settings.model?.id ?? '',
          inputTokens: response?.usage?.input_tokens ?? 0,
          outputTokens: response?.usage?.output_tokens ?? 0,
          cost: cost
        };
        imageObj.descriptions.push(newDescription);
        imageObj.activeDescriptionIndex = imageObj.descriptions.length - 1;
      }
    } catch (e: any) {
      console.error(e);
      this.showAPIErrorMessage(`An unknown error occurred while communicating with the ${settings.model?.provider} API.`);
    } finally {
      imageObj.generating = false;
      this.generating = false;
    }
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
      }
    });
  }

  previousDescription(imageObj: ImageData): void {
    if (imageObj.activeDescriptionIndex > 0) {
      imageObj.activeDescriptionIndex--;
    }
  }

  nextDescription(imageObj: ImageData): void {
    if (imageObj.activeDescriptionIndex < imageObj.descriptions.length - 1) {
      imageObj.activeDescriptionIndex++;
    }
  }

  deleteDescription(imageObj: ImageData): void {
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
        this.imageListService.deleteActiveDescription(imageObj);
      }
    });
  }

  editDescription(imageObj: ImageData): void {
    const dialogRef = this.dialog.open(EditDescriptionDialogComponent, {
      data: imageObj,
      panelClass: 'editDescriptionDialog'
    });

    dialogRef.afterClosed().subscribe((editedDescription: string | null | undefined) => {
      if (editedDescription !== null && editedDescription !== undefined) {
        imageObj.descriptions[imageObj.activeDescriptionIndex].description = editedDescription;
      }
    });
  }

  translateDescription(imageObj: ImageData): void {
    const dialogRef = this.dialog.open(TranslateDescriptionDialogComponent, {
      data: imageObj,
      panelClass: 'translateDescriptionDialog'
    });

    dialogRef.afterClosed().subscribe((targetLanguageCode: string) => {
      if (targetLanguageCode) {       
        // Find the selected language prompt
        const targetPromptsIndex = prompts.findIndex((p: Prompt) => p.languageCode == targetLanguageCode);

        if (targetPromptsIndex < 0) {
          console.error("Unable to find prompt for selected language.");
          return;
        }

        // Construct the translate prompt
        let tPrompt = prompts[targetPromptsIndex].translatePrompt.replace('{{ORIG_LANG_CODE}}', imageObj.descriptions[imageObj.activeDescriptionIndex].language);
        tPrompt += '\n\n' + imageObj.descriptions[imageObj.activeDescriptionIndex].description;

        this.generateDescriptionTranslation(imageObj, tPrompt, targetLanguageCode);
      }
    });
  }

  export(): void {
    const dialogRef = this.dialog.open(ExportDialogComponent, { minWidth: '500px' });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.value && result?.selectedExportFormat) {
        this.exporting = true;
        this.exportService.exportImageListToFile(
          result?.selectedExportFormat,
          result?.filename
        );
        this.exporting = false;
      }
    });
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
      const inputCost: number = ((usage.input_tokens ?? 0) / 1000000.0) * model.inputPrice;
      const outputCost: number = ((usage.output_tokens ?? 0) / 1000000.0) * model.outputPrice;
      return inputCost + outputCost;
    } else {
      return 0;
    }
  }

  private showAPIErrorMessage(message: string): void {
    const snackBarRef = this.snackBar.open(message, 'Dismiss', {
      duration: undefined,
      panelClass: 'snackbar-error'
    });
    snackBarRef?.onAction().subscribe(() => {
      snackBarRef.dismiss();
    });
  }

}
