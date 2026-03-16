import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { EMPTY, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { GenerateDescriptionsComponent } from './generate-descriptions.component';
import { AiService } from '../../services/ai.service';
import { BatchResultsService } from '../../services/batch-results.service';
import { CostService } from '../../services/cost.service';
import { ExportService } from '../../services/export.service';
import { ImageListService } from '../../services/image-list.service';
import { SettingsService } from '../../services/settings.service';
import { BatchResult } from '../../types/batch-result.types';
import { ImageData } from '../../types/image-data.types';

describe('GenerateDescriptionsComponent', () => {
  let component: GenerateDescriptionsComponent;
  let fixture: ComponentFixture<GenerateDescriptionsComponent>;
  let aiService: jasmine.SpyObj<AiService>;
  let exportService: jasmine.SpyObj<ExportService>;
  let costService: jasmine.SpyObj<CostService>;
  let settings: SettingsService;
  let imageListService: ImageListService;
  let batchResults: BatchResultsService;

  beforeEach(async () => {
    aiService = jasmine.createSpyObj<AiService>('AiService', [
      'describeImagesFilesApi',
      'deleteUploadedFile'
    ]);
    exportService = jasmine.createSpyObj<ExportService>('ExportService', [
      'normaliseCharacters'
    ]);
    costService = jasmine.createSpyObj<CostService>('CostService', [
      'updateCostFromResponse'
    ]);

    await TestBed.configureTestingModule({
      imports: [GenerateDescriptionsComponent, NoopAnimationsModule],
      providers: [
        { provide: AiService, useValue: aiService },
        { provide: ExportService, useValue: exportService },
        { provide: CostService, useValue: costService },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(false) }) }
        },
        {
          provide: MatSnackBar,
          useValue: {
            open: () => ({
              onAction: () => EMPTY,
              afterDismissed: () => EMPTY,
              dismiss: () => undefined
            })
          }
        }
      ]
    })
    .overrideComponent(GenerateDescriptionsComponent, {
      set: { template: '' }
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GenerateDescriptionsComponent);
    component = fixture.componentInstance;
    settings = TestBed.inject(SettingsService);
    imageListService = TestBed.inject(ImageListService);
    batchResults = TestBed.inject(BatchResultsService);

    settings.updateSelectedTaskType('transcriptionBatchTei');
    imageListService.updateImageList(buildImages());
    aiService.deleteUploadedFile.and.returnValue(Promise.resolve());
    exportService.normaliseCharacters.and.callFake((text: string) => `normalized:${text}`);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('runs a single batch pass when spellcheck is disabled', async () => {
    const batch = addBatch(batchResults, imageListService.imageList);
    aiService.describeImagesFilesApi.and.returnValue(Promise.resolve({
      text: 'first-pass',
      usage: { inputTokens: 11, outputTokens: 7 }
    }));
    costService.updateCostFromResponse.and.returnValue(0.5);

    await component.transcribeAndTeiEncodeBatch(batch);

    expect(aiService.describeImagesFilesApi).toHaveBeenCalledTimes(1);
    expect(exportService.normaliseCharacters).toHaveBeenCalledTimes(1);
    expect(exportService.normaliseCharacters).toHaveBeenCalledWith('first-pass', true);
    expect(batchResults.results()[0].teiBody).toBe('normalized:first-pass');
    expect(batchResults.results()[0].pass1TeiBody).toBe('normalized:first-pass');
    expect(batchResults.results()[0].pass2TeiBody).toBeUndefined();
    expect(batchResults.results()[0].inputTokens).toBe(11);
    expect(batchResults.results()[0].outputTokens).toBe(7);
    expect(batchResults.results()[0].cost).toBe(0.5);
    expect(aiService.deleteUploadedFile).toHaveBeenCalledTimes(2);
  });

  it('runs a spellcheck pass and normalises only the final result', async () => {
    settings.updateSpellcheckTranscription(true);
    const batch = addBatch(batchResults, imageListService.imageList);
    aiService.describeImagesFilesApi.and.returnValues(
      Promise.resolve({
        text: 'raw-tei',
        usage: { inputTokens: 10, outputTokens: 3 }
      }),
      Promise.resolve({
        text: 'spellchecked-tei',
        usage: { inputTokens: 4, outputTokens: 2 }
      })
    );
    costService.updateCostFromResponse.and.returnValues(0.25, 0.15);

    await component.transcribeAndTeiEncodeBatch(batch);

    expect(aiService.describeImagesFilesApi).toHaveBeenCalledTimes(2);
    expect(aiService.describeImagesFilesApi.calls.argsFor(1)[1]).toContain('raw-tei');
    expect(exportService.normaliseCharacters).toHaveBeenCalledTimes(2);
    expect(exportService.normaliseCharacters.calls.argsFor(0)).toEqual(['raw-tei', true]);
    expect(exportService.normaliseCharacters.calls.argsFor(1)).toEqual(['spellchecked-tei', true]);
    expect(batchResults.results()[0].teiBody).toBe('normalized:spellchecked-tei');
    expect(batchResults.results()[0].pass1TeiBody).toBe('normalized:raw-tei');
    expect(batchResults.results()[0].pass2TeiBody).toBe('normalized:spellchecked-tei');
    expect(batchResults.results()[0].inputTokens).toBe(14);
    expect(batchResults.results()[0].outputTokens).toBe(5);
    expect(batchResults.results()[0].cost).toBeCloseTo(0.4, 6);
    expect(aiService.deleteUploadedFile).toHaveBeenCalledTimes(2);
  });
});

function buildImages(): ImageData[] {
  return [
    {
      id: 1,
      filename: 'page-1.jpg',
      base64Image: 'data:image/jpeg;base64,abc',
      height: 100,
      width: 100,
      descriptions: [],
      activeDescriptionIndex: 0,
      generating: false,
      uploadKey: 'upload-1'
    },
    {
      id: 2,
      filename: 'page-2.jpg',
      base64Image: 'data:image/jpeg;base64,def',
      height: 100,
      width: 100,
      descriptions: [],
      activeDescriptionIndex: 0,
      generating: false,
      uploadKey: 'upload-2'
    }
  ];
}

function addBatch(batchResults: BatchResultsService, images: ImageData[]): BatchResult {
  const batch: BatchResult = {
    id: 'batch-1',
    createdAt: new Date().toISOString(),
    taskType: 'transcriptionBatchTei',
    status: 'pending',
    imageIds: images.map(img => img.id),
    imageNames: images.map(img => img.filename),
    batchIndex: 1,
    batchSize: images.length,
  };

  batchResults.add(batch);
  return batch;
}
