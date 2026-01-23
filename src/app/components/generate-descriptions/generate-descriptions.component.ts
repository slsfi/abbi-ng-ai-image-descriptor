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

import { BatchPlanComponent } from '../batch-plan/batch-plan.component';
import { BatchResultsComponent } from '../batch-results/batch-results.component';
import { ConfirmActionDialogComponent } from '../confirm-action-dialog/confirm-action-dialog.component';
import { EditDescriptionDialogComponent } from '../edit-description-dialog/edit-description-dialog.component';
import { ExportDialogComponent } from '../export-dialog/export-dialog.component';
import { TranslateDescriptionDialogComponent } from '../translate-description-dialog/translate-description-dialog.component';
import { CharacterCountPipe } from '../../pipes/character-count.pipe';
import { AiService } from '../../services/ai.service';
import { BatchResultsService } from '../../services/batch-results.service';
import { CostService } from '../../services/cost.service';
import { ExportService } from '../../services/export.service';
import { ImageListService } from '../../services/image-list.service';
import { SettingsService } from '../../services/settings.service';
import { BatchResult } from '../../types/batch-result.types';
import { DescriptionData } from '../../types/description-data.types';
import { ImageData } from '../../types/image-data.types';
import { AiResult } from '../../types/ai.types';
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
    BatchResultsComponent,
    CharacterCountPipe,
    BatchPlanComponent
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
  readonly batchResults = inject(BatchResultsService);
  readonly settings = inject(SettingsService);
  private readonly snackBar = inject(MatSnackBar);

  currentPaginatorSize: number = 10;
  matTableDataSource = new MatTableDataSource<ImageData>([]);
  displayedColumns: string[] = ['imagePreview', 'description', 'actions'];
  exporting: boolean = false;
  generating: boolean = false;

  teiEncoding = signal<boolean>(false);

  private progressSnackRef: any | null = null;
  private progressStopSub?: { unsubscribe(): void };
  private lastProgressMessage: string | null = null;

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

    if (settings.taskType === 'transcriptionBatchTei') {
      await this.transcribeAndTeiEncodeBatchedAll();
    } else if (settings.taskType === 'transcription' && settings.teiEncode) {
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
    this.setGlobalGenerating(true);
    this.setImageGenerating(imageObj, true);

    const settings: RequestSettings = this.settings.getSettings();
    const promptTemplate = this.constructPromptTemplate();
    const prompt = this.constructPrompt(promptTemplate, imageObj);

    const res = await this.runAiTask('image', settings, prompt, false, imageObj);
    if (res) {
      const desc = this.buildDescription(settings, res.text, res.usage, res.cost, settings.language, false);
      this.commitDescription(imageObj, desc);
    }

    this.setGlobalGenerating(false);
    this.setImageGenerating(imageObj, false);
  }

  private async transcribeAndTeiEncode(imageObj: ImageData) {
    this.setGlobalGenerating(true);
    this.setImageGenerating(imageObj, true);

    const settings: RequestSettings = this.settings.getSettings();
    const promptTemplate = {
      transcription: this.constructPromptTemplate(),
      teiEncoding: this.getTeiEncodePromptTemplate()
    }

    let transcriptionDesc: DescriptionData | null = null;

    // Loop over two passes:
    // 1. transcribe text in image
    // 2. TEI-encode transcription from previous pass
    for (const teiEncodingPass of [false, true]) {
      if (!this.generating) {
        // Generation has been stopped by user
        break;
      }

      this.teiEncoding.set(teiEncodingPass);

      const prompt: string = (teiEncodingPass && transcriptionDesc)
        ? this.getTeiEncodePromptForTranscription(promptTemplate.teiEncoding, transcriptionDesc.description)
        : this.constructPrompt(promptTemplate.transcription, imageObj);
      
      const res = await this.runAiTask('image', settings, prompt, true, imageObj);

      if (res) {
        if (teiEncodingPass) {
          // in the TEI encoding pass, store the transcribed and encoded data in a new
          // description and add metrics from the transcription pass
          const totalUsage = {
            inputTokens: (transcriptionDesc?.inputTokens ?? 0) + (res.usage?.inputTokens ?? 0),
            outputTokens: (transcriptionDesc?.outputTokens ?? 0) + (res.usage?.outputTokens ?? 0)
          };
          const totalCost = (transcriptionDesc?.cost ?? 0) + res.cost;
          const desc = this.buildDescription(settings, res.text, totalUsage, totalCost, settings.language, true);
          this.commitDescription(imageObj, desc);
        } else {
          // in the transcription pass, store the transcription data in a temporary variable
          transcriptionDesc = this.buildDescription(settings, res.text, res.usage, res.cost, settings.language, false);
        }
      } else {
        break;
      }
    }

    this.setGlobalGenerating(false);
    this.setImageGenerating(imageObj, false);
  }

  private async generateImageDescriptionsAll() {
    this.setGlobalGenerating(true);

    const settings: RequestSettings = this.settings.getSettings();
    const promptTemplate = this.constructPromptTemplate();
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
      this.openProgressSnack(`Generating ${this.settings.taskNouns().singular} ${counter}/${this.imageListService.imageList.length}`);

      this.setImageGenerating(imageObj, true);
      const prompt = this.constructPrompt(promptTemplate, imageObj);

      const res = await this.runAiTask('image', settings, prompt, true, imageObj);
      if (res) {
        const desc = this.buildDescription(settings, res.text, res.usage, res.cost, settings.language, false);
        this.commitDescription(imageObj, desc);
      }

      this.setImageGenerating(imageObj, false);
    }
  
    this.closeProgressSnack();
    this.setGlobalGenerating(false);
  }

  private async transcribeAndTeiEncodeAll() {
    this.setGlobalGenerating(true);
    
    let counter = 0;
    let lastRequestAt: number | null = null;
    const settings: RequestSettings = this.settings.getSettings();
    const promptTemplate = {
      transcription: this.constructPromptTemplate(),
      teiEncoding: this.getTeiEncodePromptTemplate()
    }

    loopImages: for (const imageObj of this.imageListService.imageList) {
      counter++;
      this.openProgressSnack(`Transcribing and TEI encoding ${counter}/${this.imageListService.imageList.length}`);

      let transcriptionDesc: DescriptionData | null = null;

      for (const teiEncodingPass of [false, true]) {
        if (!this.generating) {
          // Generation has been stopped by user
          break loopImages;
        }

        // Throttle (only when rpm < 100)
        lastRequestAt = await this.enforceRpm(settings.model?.rpm, lastRequestAt);
        if (!this.generating) {
          break loopImages;
        }

        this.setImageGenerating(imageObj, true);
        this.teiEncoding.set(teiEncodingPass);

        const prompt: string = (teiEncodingPass && transcriptionDesc)
          ? this.getTeiEncodePromptForTranscription(promptTemplate.teiEncoding, transcriptionDesc.description)
          : this.constructPrompt(promptTemplate.transcription, imageObj);
        
        const res = await this.runAiTask('image', settings, prompt, true, imageObj);

        if (res) {
          if (teiEncodingPass) {
            // in the TEI encoding pass, store the transcribed and encoded data in a new
            // description and add metrics from the transcription pass
            const totalUsage = {
              inputTokens: (transcriptionDesc?.inputTokens ?? 0) + (res.usage?.inputTokens ?? 0),
              outputTokens: (transcriptionDesc?.outputTokens ?? 0) + (res.usage?.outputTokens ?? 0)
            };
            const totalCost = (transcriptionDesc?.cost ?? 0) + res.cost;
            const desc = this.buildDescription(settings, res.text, totalUsage, totalCost, settings.language, true);
            this.commitDescription(imageObj, desc);
          } else {
            // in the transcription pass, store the transcription data in a temporary variable
            transcriptionDesc = this.buildDescription(settings, res.text, res.usage, res.cost, settings.language, false);
          }
        } else {
          break loopImages;
        }

        this.setImageGenerating(imageObj, false);
      }
    }

    this.closeProgressSnack();
    this.setGlobalGenerating(false);
  }

  private async transcribeAndTeiEncodeBatchedAll() {
    this.setGlobalGenerating(true);

    // clear old batch results at the start of a run
    this.batchResults.clear();

    const settings: RequestSettings = this.settings.getSettings();
    const prompt = this.constructPromptTemplate();

    const images = this.imageListService.imageList;
    const batchSize = settings.batchSize || 10;
    const batches = this.chunkArray(images, batchSize);

    let lastRequestAt: number | null = null;

    // Create batch results with pending status
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      const batchId = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${batchIndex}-${Math.random().toString(16).slice(2)}`;

      const pending: BatchResult = {
        id: batchId,
        createdAt: new Date().toISOString(),
        taskType: 'transcriptionBatchTei',
        status: 'pending',
        imageIds: batch.map(i => i.id),
        imageNames: batch.map(i => i.filename),
        modelId: settings.model.id,
        batchIndex: batchIndex + 1,
        batchSize: batch.length,
      };

      this.batchResults.add(pending);
    }

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      if (!this.generating) {
        break;
      }

      // Throttle per REQUEST (per batch)
      lastRequestAt = await this.enforceRpm(settings.model?.rpm, lastRequestAt);
      if (!this.generating) {
        break;
      }

      const batch = batches[batchIndex];

      this.openProgressSnack(`Generating TEI batch ${batchIndex + 1}/${batches.length} (${batch.length} ${batch.length === 1 ? 'image' : 'images'})`);

      // mark images generating (even if table hidden, keeps state consistent)
      for (const img of batch) {
        this.setImageGenerating(img, true);
      }

      const batchId = this.batchResults.results()[batchIndex].id;

      const generating: Partial<BatchResult> = {
        status: 'generating',
      };

      this.batchResults.update(batchId, generating);

      const res = await this.runAiTaskBatchImages('filesApiImages', settings, prompt, undefined, batch);
      if (res) {
        // normaliseCharacters already strips/normalizes; pass teiEncoded=true
        const teiBody = this.exportService.normaliseCharacters(res.text, true);

        this.batchResults.update(batchId, {
          status: 'success',
          teiBody,
          inputTokens: res.usage?.inputTokens ?? 0,
          outputTokens: res.usage?.outputTokens ?? 0,
          cost: res.cost,
        });
      } else {
        // runAiTaskBatchImages already showed a snackbar; mark the batch as error
        this.batchResults.update(batchId, {
          status: 'error',
          error: 'Batch request failed.',
        });

        // For stop-on-error behavior: stop the run when batch fails
        // If you prefer to continue to next batch, remove this block.
        break;
      }

      for (const img of batch) {
        this.setImageGenerating(img, false);
      }
    }

    // Ensure any “generating” flags are cleared (if user hit Stop mid-batch)
    for (const img of this.imageListService.imageList) {
      this.setImageGenerating(img, false);
    }

    this.closeProgressSnack();
    this.setGlobalGenerating(false);
  }

  async transcribeAndTeiEncodeBatch(batch: BatchResult) {
    // regenerate single batch
    this.setGlobalGenerating(true);

    const settings: RequestSettings = this.settings.getSettings();
    const prompt = this.constructPromptTemplate();
    const batchId = batch.id;
    const batchImages = this.imageListService.imageList.filter(
      (img: ImageData) => batch.imageIds.includes(img.id)
    );

    if (batchImages.length !== batch.batchSize) {
      console.error('Batch size does not correspond to number of images in batch.');
      return;
    }

    // mark images generating (even if table hidden, keeps state consistent)
    for (const img of batchImages) {
      this.setImageGenerating(img, true);
    }

    this.openProgressSnack(`Regenerating TEI batch ${batch.batchIndex} (${batch.imageIds.length} ${batch.imageIds.length === 1 ? 'image' : 'images'})`);

    const generating: Partial<BatchResult> = {
        status: 'generating',
        modelId: settings.model.id,
      };

    this.batchResults.update(batchId, generating);

    const res = await this.runAiTaskBatchImages('filesApiImages', settings, prompt, undefined, batchImages);
    if (res) {
      // normaliseCharacters already strips/normalizes; pass teiEncoded=true
      const teiBody = this.exportService.normaliseCharacters(res.text, true);

      this.batchResults.update(batchId, {
        status: 'success',
        teiBody,
        inputTokens: (batch.inputTokens ?? 0) + (res.usage?.inputTokens ?? 0),
        outputTokens: (batch.outputTokens ?? 0) + (res.usage?.outputTokens ?? 0),
        cost: (batch.cost ?? 0) + (res.cost),
      });
    } else {
      // runAiTaskBatchImages already showed a snackbar; mark the batch as error
      this.batchResults.update(batchId, {
        status: 'error',
        error: 'Batch request failed.',
      });
    }

    for (const img of batchImages) {
      this.setImageGenerating(img, false);
    }

    this.closeProgressSnack();
    this.setGlobalGenerating(false);
  }

  private async generateDescriptionTranslation(imageObj: ImageData, prompt: string, targetLanguageCode: LanguageCode) {
    this.setGlobalGenerating(true);
    this.setImageGenerating(imageObj, true);

    const settings: RequestSettings = this.settings.getSettings();

    const res = await this.runAiTask('text', settings, prompt, false);
    if (res) {
      const desc = this.buildDescription(settings, res.text, res.usage, res.cost, targetLanguageCode, false);
      this.commitDescription(imageObj, desc);
    }

    this.setGlobalGenerating(false);
    this.setImageGenerating(imageObj, false);
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
        this.aiService.deleteUploadedFile(imageObj).finally(() => {
          this.imageListService.removeImage(imageObj);
        });
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
        Promise.allSettled(this.imageListService.imageList.map(img => this.aiService.deleteUploadedFile(img)))
          .finally(() => {
            this.imageListService.updateImageList([]);
            this.batchResults.clear();
          });
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
      data: { imageObj },
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

  export(teiTranscriptions = false): void {
    const dialogRef = this.dialog.open(ExportDialogComponent, {
      data: { teiTranscriptions },
      minWidth: '500px'
    });

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

  exportTeiTranscriptions(): void {
    this.export(true);
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

  private openProgressSnack(message: string) {
    this.lastProgressMessage = message;

    this.progressStopSub?.unsubscribe();
    this.progressStopSub = undefined;

    this.progressSnackRef?.dismiss();
    this.progressSnackRef = this.snackBar.open(message, 'Stop');
    this.progressStopSub = this.progressSnackRef.onAction().subscribe(() => {
      this.setGlobalGenerating(false);
    });
  }

  private closeProgressSnack() {
    this.progressStopSub?.unsubscribe();
    this.progressStopSub = undefined;
    this.progressSnackRef?.dismiss();
    this.progressSnackRef = null;
    this.lastProgressMessage = null;
  }

  private showAPIErrorMessage(message: string): void {
    // Opening this snackbar will dismiss any existing snackbar (progress)
    // so we should tear down the progress subscription first.
    this.progressStopSub?.unsubscribe();
    this.progressStopSub = undefined;
    this.progressSnackRef = null;

    const ref = this.snackBar.open(message, 'Dismiss', {
      duration: undefined,
      panelClass: 'snackbar-error'
    });

    ref.onAction().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => ref.dismiss());

    // If we're still generating, re-open the progress snackbar after the error is dismissed.
    ref.afterDismissed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.generating && this.lastProgressMessage) {
        this.openProgressSnack(this.lastProgressMessage);
      } else {
        // Not generating anymore → clear stale progress state
        this.closeProgressSnack();
      }
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

  private setGlobalGenerating(isGenerating: boolean) {
    this.generating = isGenerating;
  }

  private setImageGenerating(imageObj: ImageData, isGenerating: boolean) {
    imageObj.generating = isGenerating;
  }

  private handleApiFailure(settings: RequestSettings, result: any, stopGeneration: boolean, imageObj?: ImageData) {
    const e = result?.error;
    if (e) {
      const msg = `Error communicating with the ${settings.model?.provider} API: ${e.code ? e.code + ' ' : ''}${e.message ?? ''}`.trim();
      this.showAPIErrorMessage(msg);
      if (stopGeneration) {
        this.setGlobalGenerating(false);
        if (imageObj !== undefined) {
          this.setImageGenerating(imageObj, false);
        }
      }
    }
  }

  private async runAiTask(
    mode: 'image' | 'text',
    settings: RequestSettings,
    prompt: string,
    stopOnError: boolean,
    imageObj?: ImageData
  ): Promise<{ text: string; usage: any; cost: number } | null> {
    try {
      if (mode === 'image' && !imageObj) {
        throw new Error('runAiTask called with mode="image" but no imageObj provided');
      }

      const result = (mode === 'image' && imageObj !== undefined)
        ? await this.aiService.describeImage(settings, prompt, imageObj.base64Image)
        : await this.aiService.responsesTextTask(settings, prompt);
      // console.log(result);
      const text = result?.text ?? '';

      if (!text && result?.error) {
        this.handleApiFailure(settings, result, stopOnError, imageObj);
        return null;
      }

      const cost = this.costService.updateCostFromResponse(settings.model, result?.usage);

      return { text, usage: result?.usage, cost };
    } catch (e) {
      console.error(e);
      this.showAPIErrorMessage(`An unknown error occurred while communicating with the ${settings.model?.provider} API: ${e}`);

      if (stopOnError) {
        this.setGlobalGenerating(false);
      }
      return null;
    }
  }

  private async runAiTaskBatchImages(
    mode: 'inlineImages' | 'filesApiImages',
    settings: RequestSettings,
    prompt: string,
    base64Images?: string[],
    images?: ImageData[]
  ): Promise<{ text: string; usage: any; cost: number } | null> {
    try {
      let result: AiResult | null = null;

      if (mode === 'inlineImages' && base64Images !== undefined) {
        result = await this.aiService.describeImages(settings, prompt, base64Images);
      } else if (mode === 'filesApiImages' && images !== undefined) {
        try {
          result = await this.aiService.describeImagesFilesApi(settings, prompt, images);
        } finally {
          // delete the uploaded files
          await Promise.allSettled(
            images
              .filter(img => img.filesApiProvider === settings.model.provider && !!img.filesApiId)
              .map(img => this.aiService.deleteUploadedFile(img))
          );
        }
      } else {
        throw new Error('Batch image mode and provided data does not match.');
      }

      const text = result?.text ?? '';
      if (!text && result?.error) {
        // no imageObj here; still show the provider error
        this.handleApiFailure(settings, result, true);
        return null;
      }

      const cost = this.costService.updateCostFromResponse(settings.model, result?.usage);
      return { text, usage: result?.usage, cost };
    } catch (e) {
      console.error(e);
      this.showAPIErrorMessage(`An unknown error occurred while communicating with the ${settings.model?.provider} API: ${e}`);
      this.setGlobalGenerating(false);
      return null;
    }
  }

  private buildDescription(
    settings: RequestSettings,
    text: string,
    usage: any,
    cost: number,
    language?: LanguageCode,
    teiEncoded?: boolean
  ): DescriptionData {
    return {
      description: this.exportService.normaliseCharacters(text, teiEncoded),
      language,
      model: settings.model?.id ?? '',
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      cost,
      teiEncoded
    };
  }

  private commitDescription(imageObj: ImageData, desc: DescriptionData) {
    imageObj.descriptions.push(desc);
    imageObj.activeDescriptionIndex = imageObj.descriptions.length - 1;
  }

  private chunkArray<T>(arr: T[], chunkSize: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      out.push(arr.slice(i, i + chunkSize));
    }
    return out;
  }

}
