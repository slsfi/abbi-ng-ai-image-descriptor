import { AfterViewInit, Component, DestroyRef, inject, OnInit, signal, ViewChild } from '@angular/core';
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

import { ConfirmActionDialogComponent } from '../confirm-action-dialog/confirm-action-dialog.component';
import { EditDescriptionDialogComponent } from '../edit-description-dialog/edit-description-dialog.component';
import { ExportDialogComponent } from '../export-dialog/export-dialog.component';
import { TranslateDescriptionDialogComponent } from '../translate-description-dialog/translate-description-dialog.component';
import { CharacterCountPipe } from '../../pipes/character-count.pipe';
import { AiService } from '../../services/ai.service';
import { CostService } from '../../services/cost.service';
import { ExportService } from '../../services/export.service';
import { ImageListService } from '../../services/image-list.service';
import { SettingsService } from '../../services/settings.service';
import { DescriptionData } from '../../types/description-data.types';
import { ImageData } from '../../types/image-data.types';
import { RequestSettings } from '../../types/settings.types';
import { LanguageCode } from '../../../assets/config/prompts';

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
  readonly costService = inject(CostService);
  private readonly exportService = inject(ExportService);
  public readonly imageListService = inject(ImageListService);
  private readonly aiService = inject(AiService);
  readonly settings = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);

  currentPaginatorSize: number = 10;
  matTableDataSource = new MatTableDataSource<ImageData>([]);
  displayedColumns: string[] = ['imagePreview', 'description', 'actions'];
  exporting: boolean = false;
  generating: boolean = false;

  teiEncoding = signal<boolean>(false);

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

  async generateAll() {
    const settings: RequestSettings = this.settings.getSettings();

    if (settings.taskType === 'transcription' && settings.teiEncode) {
      await this.transcribeAndTeiEncodeAll();
    } else {
      await this.generateImageDescriptionsAll();
    }
  }

  async generate(imageObj: ImageData) {
    const settings: RequestSettings = this.settings.getSettings();

    if (settings.taskType === 'transcription' && settings.teiEncode) {
      await this.transcribeAndTeiEncode(imageObj);
    } else {
      await this.generateImageDescription(imageObj);
    }
  }

  private async generateImageDescription(imageObj: ImageData) {
    imageObj.generating = true;
    this.generating = true;

    const settings: RequestSettings = this.settings.getSettings();

    const promptTemplate = this.constructPromptTemplate();
    const prompt = this.constructPrompt(promptTemplate, imageObj);

    try {
      const result = await this.aiService.describeImage(settings, prompt, imageObj.base64Image);
      // console.log(result);
      const respContent = result?.text ?? '';

      if (!respContent && result?.error) {
        const e = result.error;
        const eMessage = `Error communicating with the ${settings.model.provider} API: ${e.message}`;
        this.showAPIErrorMessage(eMessage);
      } else {
        const cost = this.costService.updateCostFromResponse(settings.model, result?.usage);
        const newDescription: DescriptionData = {
          description: this.exportService.normaliseCharacters(respContent),
          language: settings.language,
          model: settings.model?.id ?? '',
          inputTokens: result?.usage?.inputTokens ?? 0,
          outputTokens: result?.usage?.outputTokens ?? 0,
          cost: cost,
          teiEncoded: false
        };
        imageObj.descriptions.push(newDescription);
        imageObj.activeDescriptionIndex = imageObj.descriptions.length - 1;
      }
    } catch (e: any) {
      console.error(e);
      this.showAPIErrorMessage(`An unknown error occurred while communicating with the ${settings.model.provider} API.`);
    } finally {
      imageObj.generating = false;
      this.generating = false;
    }
  }

  private async transcribeAndTeiEncode(imageObj: ImageData) {
    imageObj.generating = true;
    this.generating = true;

    const settings: RequestSettings = this.settings.getSettings();

    const promptTemplate = {
      transcription: this.constructPromptTemplate(),
      teiEncoding: this.getTeiEncodePromptTemplate()
    }

    let transcriptionDesc: DescriptionData | null = null;

    for (const teiEncodingPass of [false, true]) {
      if (!this.generating) {
        // Generation has been stopped by user
        break;
      }

      imageObj.generating = true;
      this.teiEncoding.set(teiEncodingPass);

      const prompt: string = (teiEncodingPass && transcriptionDesc)
        ? this.getTeiEncodePromptForTranscription(promptTemplate.teiEncoding, transcriptionDesc.description)
        : this.constructPrompt(promptTemplate.transcription, imageObj);
      
      try {
        const result = await this.aiService.describeImage(settings, prompt, imageObj.base64Image);
        // console.log(response);
        const respContent = result?.text ?? '';

        if (!respContent && result?.error) {
          const e = result.error;
          const eMessage = `Error communicating with the ${settings.model.provider} API: ${e.message}`;
          this.showAPIErrorMessage(eMessage);
          this.generating = false;
        } else {
          const cost = this.costService.updateCostFromResponse(settings.model, result?.usage);

          if (teiEncodingPass) {
            // in the TEI encoding pass, store the transcribed and encoded data in a new
            // description and add metrics from the transcription pass
            const newDescription: DescriptionData = {
              description: this.exportService.normaliseCharacters(respContent, true),
              language: settings.language,
              model: settings.model?.id ?? '',
              inputTokens: (transcriptionDesc?.inputTokens ?? 0) + (result?.usage?.inputTokens ?? 0),
              outputTokens: (transcriptionDesc?.outputTokens ?? 0) + (result?.usage?.outputTokens ?? 0),
              cost: (transcriptionDesc?.cost ?? 0) + cost,
              teiEncoded: true
            };
            imageObj.descriptions.push(newDescription);
            imageObj.activeDescriptionIndex = imageObj.descriptions.length - 1; 
          } else {
            // in the transcription pass, store the transcription data in a temporary variable
            transcriptionDesc = {
              description: this.exportService.normaliseCharacters(respContent, false),
              language: settings.language,
              model: settings.model?.id ?? '',
              inputTokens: result?.usage?.inputTokens ?? 0,
              outputTokens: result?.usage?.outputTokens ?? 0,
              cost: cost,
              teiEncoded: false
            };
          }
        }
      } catch (e: any) {
        console.error(e);
        this.showAPIErrorMessage(`An unknown error occurred while communicating with the ${settings.model.provider} API.`);
        this.generating = false;
      } finally {
        imageObj.generating = false;
      }
    }

    imageObj.generating = false;
    this.generating = false;
  }

  private async generateImageDescriptionsAll() {
    this.generating = true;

    const settings: RequestSettings = this.settings.getSettings();

    const promptTemplate = this.constructPromptTemplate();

    let snackBarRef = null;
    let counter = 0;

    let lastRequestAt: number | null = null;

    for (const imageObj of this.imageListService.imageList) {
      if (!this.generating) {
        // Generation has been stopped by user
        break;
      }

      // Throttle (only when rpm < 100)
      lastRequestAt = await this.enforceRpm(settings.model?.rpm, lastRequestAt);
      if (!this.generating) {
        break;
      }

      counter++;
      snackBarRef?.dismiss();
      snackBarRef = this.snackBar.open(`Generating ${this.settings.taskNouns().singular} ${counter}/${this.imageListService.imageList.length}`, 'Stop');
      snackBarRef.onAction().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.generating = false;
      });

      imageObj.generating = true;
      const prompt = this.constructPrompt(promptTemplate, imageObj);

      try {
        const result = await this.aiService.describeImage(settings, prompt, imageObj.base64Image);
        // console.log(response);
        const respContent = result?.text ?? '';

        if (!respContent && result?.error) {
          const e = result.error;
          const eMessage = `Error communicating with the ${settings.model.provider} API: ${e.message}`;
          this.showAPIErrorMessage(eMessage);
          this.generating = false;
        } else {
          const cost = this.costService.updateCostFromResponse(settings.model, result?.usage);
          const newDescription: DescriptionData = {
            description: this.exportService.normaliseCharacters(respContent),
            language: settings.language,
            model: settings.model?.id ?? '',
            inputTokens: result?.usage?.inputTokens ?? 0,
            outputTokens: result?.usage?.outputTokens ?? 0,
            cost: cost,
            teiEncoded: false
          };
          imageObj.descriptions.push(newDescription);
          imageObj.activeDescriptionIndex = imageObj.descriptions.length - 1;
        }
      } catch (e: any) {
        console.error(e);
        this.showAPIErrorMessage(`An unknown error occurred while communicating with the ${settings.model.provider} API.`);
        this.generating = false;
      } finally {
        imageObj.generating = false;
      }
    }
  
    this.generating = false;
    snackBarRef?.dismiss();
  }

  private async transcribeAndTeiEncodeAll() {
    this.generating = true;
    
    let snackBarRef = null;
    let counter = 0;
    let lastRequestAt: number | null = null;

    const settings: RequestSettings = this.settings.getSettings();

    const promptTemplate = {
      transcription: this.constructPromptTemplate(),
      teiEncoding: this.getTeiEncodePromptTemplate()
    }

    loop1: for (const imageObj of this.imageListService.imageList) {
      counter++;

      snackBarRef?.dismiss();
      snackBarRef = this.snackBar.open(`Transcribing and TEI encoding ${counter}/${this.imageListService.imageList.length}`, 'Stop');
      snackBarRef.onAction().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.generating = false;
      });

      let transcriptionDesc: DescriptionData | null = null;

      loop2: for (const teiEncodingPass of [false, true]) {
        if (!this.generating) {
          // Generation has been stopped by user
          break loop1;
        }

        // Throttle (only when rpm < 100)
        lastRequestAt = await this.enforceRpm(settings.model?.rpm, lastRequestAt);
        if (!this.generating) {
          break loop1;
        }

        imageObj.generating = true;
        this.teiEncoding.set(teiEncodingPass);

        const prompt: string = (teiEncodingPass && transcriptionDesc)
          ? this.getTeiEncodePromptForTranscription(promptTemplate.teiEncoding, transcriptionDesc.description)
          : this.constructPrompt(promptTemplate.transcription, imageObj);
        
        try {
          const result = await this.aiService.describeImage(settings, prompt, imageObj.base64Image);
          // console.log(response);
          const respContent = result?.text ?? '';

          if (!respContent && result?.error) {
            const e = result.error;
            const eMessage = `Error communicating with the ${settings.model.provider} API: ${e.message}`;
            this.showAPIErrorMessage(eMessage);
            this.generating = false;
          } else {
            const cost = this.costService.updateCostFromResponse(settings.model, result?.usage);

            if (teiEncodingPass) {
              // in the TEI encoding pass, store the transcribed and encoded data in a new
              // description and add metrics from the transcription pass
              const newDescription: DescriptionData = {
                description: this.exportService.normaliseCharacters(respContent, true),
                language: settings.language,
                model: settings.model?.id ?? '',
                inputTokens: (transcriptionDesc?.inputTokens ?? 0) + (result?.usage?.inputTokens ?? 0),
                outputTokens: (transcriptionDesc?.outputTokens ?? 0) + (result?.usage?.outputTokens ?? 0),
                cost: (transcriptionDesc?.cost ?? 0) + cost,
                teiEncoded: true
              };
              imageObj.descriptions.push(newDescription);
              imageObj.activeDescriptionIndex = imageObj.descriptions.length - 1; 
            } else {
              // in the transcription pass, store the transcription data in a temporary variable
              transcriptionDesc = {
                description: this.exportService.normaliseCharacters(respContent, false),
                language: settings.language,
                model: settings.model?.id ?? '',
                inputTokens: result?.usage?.inputTokens ?? 0,
                outputTokens: result?.usage?.outputTokens ?? 0,
                cost: cost,
                teiEncoded: false
              };
            }
          }
        } catch (e: any) {
          console.error(e);
          this.showAPIErrorMessage(`An unknown error occurred while communicating with the ${settings.model.provider} API.`);
          this.generating = false;
        } finally {
          imageObj.generating = false;
        }
      }
    }
    
    this.generating = false;
    snackBarRef?.dismiss();
  }

  private async generateDescriptionTranslation(imageObj: ImageData, prompt: string, targetLanguageCode: LanguageCode) {
    imageObj.generating = true;
    this.generating = true;
    const settings: RequestSettings = this.settings.getSettings();

    try {
      const result = await this.aiService.responsesTextTask(settings, prompt);
      // console.log(response);
      const respContent = result?.text ?? '';

      if (!respContent && result?.error) {
        const e = result.error;
        const eMessage = `Error communicating with the ${settings.model?.provider} API: ${e.code} ${e.message}`;
        this.showAPIErrorMessage(eMessage);
      } else {
        const cost = this.costService.updateCostFromResponse(settings.model, result?.usage);
        const newDescription: DescriptionData = {
          description: this.exportService.normaliseCharacters(respContent),
          language: targetLanguageCode,
          model: settings.model?.id ?? '',
          inputTokens: result?.usage?.inputTokens ?? 0,
          outputTokens: result?.usage?.outputTokens ?? 0,
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
        title: `Delete this ${this.settings.taskNouns().singular}?`,
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

    dialogRef.afterClosed().subscribe((targetLanguageCode: LanguageCode) => {
      if (targetLanguageCode) {
        // Find the selected language prompt
        const taskConfig = this.settings.selectedTaskConfig();
        const basePrompt = taskConfig.helpers?.translatePrompt?.[targetLanguageCode] ?? '';

        if (!basePrompt) {
          console.error('Unable to find translate prompt for language ', targetLanguageCode);
        }

        // Construct the translate prompt
        let tPrompt = basePrompt.replace(
          '{{ORIG_LANG_CODE}}',
          imageObj.descriptions[imageObj.activeDescriptionIndex].language ?? 'unknown'
        );
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
    const taskConfig = this.settings.selectedTaskConfig();
    const promptVariant = this.settings.selectedVariant();

    let promptTemplate = promptVariant.prompt;
    if (taskConfig.taskType === 'altText' && this.settings.includeFilename() && promptVariant.languageCode) {
      const filenamePrompt = taskConfig.helpers?.filenamePrompt?.[promptVariant.languageCode] ?? '';
      promptTemplate = promptTemplate + '\n\n' + filenamePrompt;
    }

    return promptTemplate;
  }

  private constructPrompt(promptTemplate: string, imageObj: any): string {
    let prompt: string = promptTemplate.replaceAll(
      '{{DESC_LENGTH}}',
      String(this.settings.selectedDescLength())
    );
    if (this.settings.includeFilename() && prompt) {
      prompt = prompt.replaceAll('{{FILENAME}}', imageObj.filename);
    }
    return prompt;
  }

  private showAPIErrorMessage(message: string): void {
    const snackBarRef = this.snackBar.open(message, 'Dismiss', {
      duration: undefined,
      panelClass: 'snackbar-error'
    });
    snackBarRef?.onAction().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      snackBarRef.dismiss();
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async enforceRpm(rpm: number | undefined, lastAt: number | null): Promise<number> {
    // only throttle low-RPM models
    if (!rpm || rpm >= 100) {
      return Date.now();
    }
    const minIntervalMs = Math.ceil(60000 / rpm);

    const now = Date.now();
    const elapsed = lastAt === null ? Infinity : (now - lastAt);
    const waitMs = Math.max(0, minIntervalMs - elapsed);

    if (waitMs > 0) {
      await this.sleep(waitMs);
    }
    return Date.now();
  }

  private getTeiEncodePromptTemplate(): string {
    const taskConfig = this.settings.selectedTaskConfig();
    return taskConfig.helpers?.teiEncodePrompt ?? '';
  }

  private getTeiEncodePromptForTranscription(promptTemplate: string, transcription: string): string {
    return promptTemplate.replaceAll(
      '{{AI_TRANSCRIPTION}}',
      transcription
    );
  }

}
