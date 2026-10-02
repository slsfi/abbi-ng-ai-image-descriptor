import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';

import { GenerateDescriptionsComponent } from './generate-descriptions.component';
import Prism from '../../utils/prism';
import { AiService } from '../../services/ai.service';
import { CostService } from '../../services/cost.service';
import { ExportService } from '../../services/export.service';
import { ImageListService } from '../../services/image-list.service';
import { SettingsService } from '../../services/settings.service';
import { AiResult } from '../../types/ai.types';
import { DescriptionData } from '../../types/description-data.types';
import { ImageData } from '../../types/image-data.types';

describe('GenerateDescriptionsComponent', () => {
  let component: GenerateDescriptionsComponent;
  let fixture: ComponentFixture<GenerateDescriptionsComponent>;
  let imageList: ImageListService;
  let settings: SettingsService;
  const ai = {
    describeImage: vi.fn<AiService['describeImage']>(),
    responsesTextTask: vi.fn<AiService['responsesTextTask']>(),
    describeImagesFilesApi: vi.fn<AiService['describeImagesFilesApi']>(),
    deleteUploadedFile: vi.fn<AiService['deleteUploadedFile']>()
  };
  const costs = { cumulativeCost: () => 0, updateCostFromResponse: vi.fn(() => 0) };
  const snackActions: Subject<void>[] = [];
  const snackDismissals: Subject<void>[] = [];
  const snackBar = {
    open: vi.fn((_message: string) => {
      const action = new Subject<void>();
      const dismissed = new Subject<void>();
      snackActions.push(action);
      snackDismissals.push(dismissed);
      return {
        dismiss: vi.fn(),
        onAction: () => action.asObservable(),
        afterDismissed: () => dismissed.asObservable()
      };
    })
  };

  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(done => { resolve = done; });
    return { promise, resolve };
  }

  function description(text: string, teiEncoded = false): DescriptionData {
    return { description: text, language: 'en', model: 'gpt-4.1', inputTokens: 0, outputTokens: 0, cost: 0, teiEncoded };
  }

  function image(descriptions: DescriptionData[] = [], activeDescriptionIndex = 0): ImageData {
    const id = imageList.generateId();
    return {
      id, filename: `image-${id}.png`, uploadKey: `upload-${id}`,
      base64Image: `data:image/png;base64,image-${id}`, height: 50, width: 100,
      generating: false, descriptions, activeDescriptionIndex
    };
  }

  async function showImages(...images: ImageData[]): Promise<void> {
    imageList.updateImageList(images);
    await fixture.whenStable();
  }

  function row(image: ImageData): HTMLTableRowElement {
    const root: HTMLElement = fixture.nativeElement;
    return [...root.querySelectorAll<HTMLTableRowElement>('tr[mat-row]')]
      .find(row => row.querySelector('.filename')?.textContent === image.filename)!;
  }

  function expectText(image: ImageData, text: string, count: number): void {
    expect(row(image).querySelector('.desc-text')?.textContent?.trim()).toBe(text);
    expect(row(image).querySelector('.desc-length')?.textContent?.replace(/\s+/g, ' ').trim())
      .toBe(`Length: ${count} characters`);
  }

  function buttonWithText(text: string): HTMLButtonElement {
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    return [...buttons].find(button => button.textContent?.replace(/\s+/g, ' ').trim().includes(text))!;
  }

  function batchButton(index: number, label: string): HTMLButtonElement {
    const batchRow: HTMLElement = fixture.nativeElement.querySelectorAll('.batch-result-wrapper')[index];
    return batchRow.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
  }

  async function showCompletedBatches(count = 2) {
    const images = Array.from({ length: count }, () => image());
    await showImages(...images);
    settings.updateSelectedTaskType('transcriptionBatchTei');
    settings.updateBatchSize(1);
    await fixture.whenStable();
    settings.updateSelectedModelId('gpt-5.6-terra');
    await fixture.whenStable();
    for (const [index, img] of images.entries()) {
      component.batchResults.add({
        id: `batch-${index}`, createdAt: '2026-10-01T00:00:00.000Z',
        taskType: 'transcriptionBatchTei', imageIds: [img.id],
        batchIndex: index + 1, batchSize: 1, status: 'success',
        teiBody: `<p>Batch ${index + 1}</p>`
      });
    }
    await fixture.whenStable();
    return component.batchResults.results();
  }

  function dialogResult<T>(): Subject<T> {
    const result = new Subject<T>();
    vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({
      afterClosed: () => result.asObservable()
    } as MatDialogRef<unknown, T>);
    return result;
  }

  async function enableTei(): Promise<void> {
    settings.updateSelectedTaskType('transcription');
    await fixture.whenStable();
    settings.updateSelectedModelId('gpt-5.6-terra');
    settings.teiEncode.set(true);
    await fixture.whenStable();
  }

  async function startTeiWithPendingCleanup(image: ImageData) {
    await enableTei();
    const tei = '<p>TEI result</p>';
    const cleanup = deferred<void>();
    ai.describeImagesFilesApi.mockResolvedValueOnce({ text: 'Transcription' });
    ai.describeImagesFilesApi.mockResolvedValueOnce({ text: `<body>${tei}</body>` });
    ai.deleteUploadedFile.mockReturnValueOnce(cleanup.promise);

    const generating = component.generate(image);
    await vi.waitFor(() => expect(ai.deleteUploadedFile).toHaveBeenCalledTimes(1));
    await fixture.whenStable();
    return { tei, cleanup, generating };
  }

  beforeEach(async () => {
    for (const mock of Object.values(ai)) mock.mockReset();
    ai.describeImage.mockResolvedValue({ text: '' });
    ai.responsesTextTask.mockResolvedValue({ text: '' });
    ai.describeImagesFilesApi.mockResolvedValue({ text: '' });
    ai.deleteUploadedFile.mockResolvedValue(undefined);
    costs.updateCostFromResponse.mockClear();
    snackActions.length = 0;
    snackDismissals.length = 0;
    snackBar.open.mockClear();
    await TestBed.configureTestingModule({
      imports: [GenerateDescriptionsComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AiService, useValue: ai },
        { provide: CostService, useValue: costs },
        { provide: MatSnackBar, useValue: snackBar }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GenerateDescriptionsComponent);
    component = fixture.componentInstance;
    imageList = TestBed.inject(ImageListService);
    settings = TestBed.inject(SettingsService);
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('attaches the paginator when images arrive and replaces it across conditional table views', async () => {
    expect(component.paginator()).toBeUndefined();
    expect(component.matTableDataSource.paginator).toBeNull();

    await showImages(image());
    const firstPaginator = component.paginator();
    expect(firstPaginator).toBeDefined();
    expect(component.matTableDataSource.paginator).toBe(firstPaginator);

    settings.updateSelectedTaskType('transcriptionBatchTei');
    await fixture.whenStable();
    expect(component.paginator()).toBeUndefined();
    expect(component.matTableDataSource.paginator).toBeNull();

    settings.updateSelectedTaskType('altText');
    await fixture.whenStable();
    expect(component.paginator()).toBeDefined();
    expect(component.paginator()).not.toBe(firstPaginator);
    expect(component.matTableDataSource.paginator).toBe(component.paginator());
  });

  it('renders single-image generation controls and row progress through a delayed result', async () => {
    const target = image();
    await showImages(target);
    const result = deferred<AiResult>();
    ai.describeImage.mockReturnValueOnce(result.promise);

    const generating = component.generate(target);
    await vi.waitFor(() => expect(ai.describeImage).toHaveBeenCalledTimes(1));
    await fixture.whenStable();
    expect(component.generating()).toBe(true);
    expect(buttonWithText('Generate all').disabled).toBe(true);
    expect(buttonWithText('Export').disabled).toBe(true);
    expect(row(target).querySelector('mat-spinner')).not.toBeNull();

    result.resolve({ text: 'Deferred result' });
    await generating;
    await fixture.whenStable();
    expect(component.generating()).toBe(false);
    expect(buttonWithText('Generate all').disabled).toBe(false);
    expect(buttonWithText('Export').disabled).toBe(false);
    expectText(target, 'Deferred result', 15);
    expect(row(target).querySelector('mat-spinner')).toBeNull();
  });

  it('renders a deferred plain-text edit through the observable while global generation and costs stay unchanged', async () => {
    const original = description('Original text');
    const first = image([original]);
    const second = image();
    await showImages(first, second);
    const previousList = imageList.imageList;
    const edited = dialogResult<string | null>();
    const highlight = vi.spyOn(Prism, 'highlightElement');
    component.editDescription(first);
    await fixture.whenStable();

    edited.next('Edited plain text');
    edited.complete();
    await fixture.whenStable();

    expectText(first, 'Edited plain text', 17);
    expect(row(first).querySelector('.edit-button')).not.toBeNull();
    expect(component.generating()).toBe(false);
    expect(costs.updateCostFromResponse).not.toHaveBeenCalled();
    expect(highlight).not.toHaveBeenCalled();
    expect(imageList.imageList).not.toBe(previousList);
    expect(imageList.imageList[0]).toBe(first);
    expect(imageList.imageList[1]).toBe(second);
    expect(first.descriptions[0]).toBe(original);
    expect(first.activeDescriptionIndex).toBe(0);
    expect(component.matTableDataSource.data).toEqual([first, second]);
  });

  it('renders async row progress and commits between sequential requests while global generation stays active', async () => {
    const first = image();
    const second = image();
    await showImages(first, second);
    const firstResult = deferred<AiResult>();
    const secondResult = deferred<AiResult>();
    ai.describeImage.mockReturnValueOnce(firstResult.promise).mockReturnValueOnce(secondResult.promise);
    const generating = component.generateAll();
    await vi.waitFor(() => expect(ai.describeImage).toHaveBeenCalledTimes(1));
    await fixture.whenStable();
    expect(row(first).querySelector('mat-spinner')).not.toBeNull();
    expect(row(second).querySelector('mat-spinner')).toBeNull();
    expect(component.generating()).toBe(true);
    expect(buttonWithText('Generate all').disabled).toBe(true);
    expect(buttonWithText('Export').disabled).toBe(true);

    firstResult.resolve({ text: 'First description' });
    await vi.waitFor(() => expect(ai.describeImage).toHaveBeenCalledTimes(2));
    await fixture.whenStable();
    expectText(first, 'First description', 17);
    expect(row(first).querySelector('mat-spinner')).toBeNull();
    expect(row(second).querySelector('mat-spinner')).not.toBeNull();
    expect(component.generating()).toBe(true);
    expect(costs.cumulativeCost()).toBe(0);
    expect(imageList.imageList[0]).toBe(first);
    expect(imageList.imageList[1]).toBe(second);
    expect(first.activeDescriptionIndex).toBe(0);

    secondResult.resolve({ text: 'Second result' });
    await generating;
    await fixture.whenStable();
    expectText(second, 'Second result', 13);
    expect(row(second).querySelector('mat-spinner')).toBeNull();
    expect(component.generating()).toBe(false);
    expect(buttonWithText('Generate all').disabled).toBe(false);
    expect(buttonWithText('Export').disabled).toBe(false);
    expect(row(first).querySelectorAll('td')[2].textContent).toContain('Regenerate');
  });

  it('publishes a failed row flag transition once even when cleanup clears the same flag again', async () => {
    const first = image();
    const second = image();
    await showImages(first, second);
    const states: boolean[][] = [];
    const subscription = imageList.imageList$.subscribe(list => states.push(list.map(image => image.generating)));
    const result = deferred<AiResult>();
    ai.describeImage.mockReturnValueOnce(result.promise);
    const generating = component.generateAll();
    await vi.waitFor(() => expect(ai.describeImage).toHaveBeenCalledTimes(1));
    await fixture.whenStable();
    expect(row(first).querySelector('mat-spinner')).not.toBeNull();

    result.resolve({ text: '', error: { code: 400, message: 'Provider error' } });
    await generating;
    await fixture.whenStable();
    expect(states).toEqual([[false, false], [true, false], [false, false]]);
    expect(row(first).querySelector('mat-spinner')).toBeNull();
    expect(row(first).querySelector('.no-desc')).not.toBeNull();
    expect(first.descriptions).toEqual([]);
    expect(ai.describeImage).toHaveBeenCalledTimes(1);
    expect(component.generating()).toBe(false);
    expect(buttonWithText('Generate all').disabled).toBe(false);
    expect(snackBar.open).toHaveBeenCalledTimes(2);
    snackDismissals[1].next();
    snackDismissals[1].complete();
    expect(snackBar.open).toHaveBeenCalledTimes(2);
    subscription.unsubscribe();
  });

  it('stops after an awaited request when the progress action clears the generation signal', async () => {
    const first = image();
    const second = image();
    await showImages(first, second);
    const firstResult = deferred<AiResult>();
    ai.describeImage.mockReturnValueOnce(firstResult.promise);

    const generating = component.generateAll();
    await vi.waitFor(() => expect(ai.describeImage).toHaveBeenCalledTimes(1));
    snackActions[0].next();
    await fixture.whenStable();
    expect(component.generating()).toBe(false);
    expect(buttonWithText('Generate all').disabled).toBe(false);
    expect(row(first).querySelector('mat-spinner')).not.toBeNull();

    firstResult.resolve({ text: 'Completed in-flight result' });
    await generating;
    await fixture.whenStable();
    expect(ai.describeImage).toHaveBeenCalledTimes(1);
    expectText(first, 'Completed in-flight result', 26);
    expect(second.descriptions).toEqual([]);
    expect(first.generating).toBe(false);
    expect(second.generating).toBe(false);
  });

  it('stops during a rate-limit delay before starting the next request', async () => {
    const first = image();
    const second = image();
    await showImages(first, second);
    const delay = deferred<number>();
    const enforceRpm = vi.spyOn(component as any, 'enforceRpm')
      .mockResolvedValueOnce(1)
      .mockReturnValueOnce(delay.promise);
    ai.describeImage.mockResolvedValueOnce({ text: 'First result' });

    const generating = component.generateAll();
    await vi.waitFor(() => expect(enforceRpm).toHaveBeenCalledTimes(2));
    expect(ai.describeImage).toHaveBeenCalledTimes(1);
    snackActions[0].next();
    delay.resolve(2);
    await generating;
    await fixture.whenStable();

    expect(component.generating()).toBe(false);
    expect(ai.describeImage).toHaveBeenCalledTimes(1);
    expectText(first, 'First result', 12);
    expect(second.descriptions).toEqual([]);
    expect(buttonWithText('Generate all').disabled).toBe(false);
  });

  it('renders an async translation as the selected description with navigation actions and length', async () => {
    const original = description('Original text');
    const target = image([original]);
    await showImages(target);
    const language = dialogResult<string>();
    const translated = deferred<AiResult>();
    ai.responsesTextTask.mockReturnValueOnce(translated.promise);
    component.translateDescription(target);
    await fixture.whenStable();

    language.next('fi');
    language.complete();
    await fixture.whenStable();
    expect(row(target).querySelector('mat-spinner')).not.toBeNull();
    expect(ai.responsesTextTask).toHaveBeenCalledTimes(1);
    translated.resolve({ text: 'Translated text' });
    await vi.waitFor(() => expect(target.descriptions).toHaveLength(2));
    await fixture.whenStable();

    expectText(target, 'Translated text', 15);
    expect(target.activeDescriptionIndex).toBe(1);
    expect(target.descriptions[1].language).toBe('fi');
    expect(target.descriptions[0]).toBe(original);
    expect(row(target).querySelector('.counter')?.textContent).toBe('2/2');
    expect(row(target).querySelector<HTMLButtonElement>('button[aria-label^="Previous"]')?.disabled).toBe(false);
    expect(row(target).querySelector<HTMLButtonElement>('button[aria-label^="Next"]')?.disabled).toBe(true);
    expect(imageList.imageList[0]).toBe(target);
  });

  it('publishes description navigation and leaves the stream unchanged at either boundary', async () => {
    const target = image([description('First'), description('Second'), description('Third')]);
    await showImages(target);
    const emitted = vi.fn();
    const subscription = imageList.imageList$.subscribe(emitted);

    component.previousDescription(target);
    expect(emitted).toHaveBeenCalledTimes(1);
    component.nextDescription(target);
    await fixture.whenStable();
    expectText(target, 'Second', 6);
    expect(row(target).querySelector('.counter')?.textContent).toBe('2/3');
    expect(target.activeDescriptionIndex).toBe(1);

    component.nextDescription(target);
    await fixture.whenStable();
    expectText(target, 'Third', 5);
    expect(row(target).querySelector<HTMLButtonElement>('button[aria-label^="Next"]')?.disabled).toBe(true);
    component.nextDescription(target);
    expect(emitted).toHaveBeenCalledTimes(3);

    component.previousDescription(target);
    component.previousDescription(target);
    await fixture.whenStable();
    expectText(target, 'First', 5);
    expect(row(target).querySelector('.counter')?.textContent).toBe('1/3');
    expect(row(target).querySelector<HTMLButtonElement>('button[aria-label^="Previous"]')?.disabled).toBe(true);
    expect(imageList.imageList[0]).toBe(target);
    subscription.unsubscribe();
  });

  it('renders deferred deletion, the corrected active index, and removal of the last description actions', async () => {
    const first = description('First');
    const target = image([first, description('Second')], 1);
    await showImages(target);
    const confirmation = dialogResult<boolean>();
    component.deleteDescription(target);
    await fixture.whenStable();

    confirmation.next(true);
    await fixture.whenStable();
    expectText(target, 'First', 5);
    expect(target.activeDescriptionIndex).toBe(0);
    expect(target.descriptions[0]).toBe(first);
    expect(row(target).querySelector('.counter')).toBeNull();
    expect(row(target).querySelector('.edit-button')).not.toBeNull();
    confirmation.complete();

    const lastConfirmation = dialogResult<boolean>();
    component.deleteDescription(target);
    await fixture.whenStable();
    lastConfirmation.next(true);
    lastConfirmation.complete();
    await fixture.whenStable();
    expect(row(target).querySelector('.no-desc')).not.toBeNull();
    expect(row(target).querySelector('.desc-length')).toBeNull();
    expect(row(target).querySelector('.edit-button')).toBeNull();
    expect(row(target).querySelectorAll('td')[2].textContent).not.toContain('Regenerate');
    expect(imageList.imageList[0]).toBe(target);
  });

  it('refreshes real TEI highlighting after navigation, editing, and deleting the selected description', async () => {
    const first = description('<body><p>First</p></body>', true);
    const second = description('<body><p>Second</p></body>', true);
    const target = image([first, second]);
    await showImages(target);
    component.nextDescription(target);
    await fixture.whenStable();
    let code = row(target).querySelector('code')!;
    expect(code.textContent).toBe(second.description);
    expect(code.querySelector('.token.tag')).not.toBeNull();

    component.previousDescription(target);
    await fixture.whenStable();
    code = row(target).querySelector('code')!;
    expect(code.textContent).toBe(first.description);
    expect(code.querySelector('.token.tag')).not.toBeNull();
    const edited = dialogResult<string>();
    component.editDescription(target);
    await fixture.whenStable();
    const newTei = '<body><p>Edited TEI</p></body>';
    edited.next(newTei);
    edited.complete();
    await fixture.whenStable();
    code = row(target).querySelector('code')!;
    expect(code.textContent).toBe(newTei);
    expect(code.querySelector('.token.tag')).not.toBeNull();
    expect(row(target).querySelector('.desc-length')?.textContent).toContain(`${newTei.length} characters`);

    const confirmation = dialogResult<boolean>();
    component.deleteDescription(target);
    await fixture.whenStable();
    confirmation.next(true);
    confirmation.complete();
    await fixture.whenStable();
    code = row(target).querySelector('code')!;
    expect(target.activeDescriptionIndex).toBe(0);
    expect(target.descriptions[0]).toBe(second);
    expect(code.textContent).toBe(second.description);
    expect(code.querySelector('.token.tag')).not.toBeNull();
  });

  it('renders the transcription and TEI phases before highlighting the encoded result', async () => {
    const target = image();
    await showImages(target);
    await enableTei();
    const transcription = deferred<AiResult>();
    const encoding = deferred<AiResult>();
    ai.describeImagesFilesApi
      .mockReturnValueOnce(transcription.promise)
      .mockReturnValueOnce(encoding.promise);

    const generating = component.generate(target);
    await vi.waitFor(() => expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(1));
    await fixture.whenStable();
    expect(component.teiEncoding()).toBe(false);
    expect(row(target).querySelector('.spinner-label')?.textContent).toContain('Generating transcription');

    transcription.resolve({ text: 'Transcribed text' });
    await vi.waitFor(() => expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(2));
    await fixture.whenStable();
    expect(component.teiEncoding()).toBe(true);
    expect(row(target).querySelector('.spinner-label')?.textContent).toContain('Generating TEI encoding');

    encoding.resolve({ text: '<body><p>Encoded result</p></body>' });
    await generating;
    await fixture.whenStable();
    const code = row(target).querySelector('code')!;
    expect(component.generating()).toBe(false);
    expect(component.teiEncoding()).toBe(false);
    expect(code.textContent).toBe('<p>Encoded result</p>');
    expect(code.querySelector('.token.tag')).not.toBeNull();
  });

  it('keeps a TEI highlighting request until upload cleanup finishes and its code actually renders', async () => {
    const target = image();
    await showImages(target);
    const highlight = vi.spyOn(Prism, 'highlightElement');
    const { tei, cleanup, generating } = await startTeiWithPendingCleanup(target);
    expect(target.descriptions[0].description).toBe(tei);
    expect(target.generating).toBe(true);
    expect(row(target).querySelector('mat-spinner')).not.toBeNull();
    expect(row(target).querySelector('code')).toBeNull();
    expect(highlight).not.toHaveBeenCalled();
    expect(ai.describeImagesFilesApi.mock.calls[0][2][0]).toBe(target);
    expect(ai.describeImagesFilesApi.mock.calls[1][2][0]).toBe(target);
    expect(ai.deleteUploadedFile).toHaveBeenCalledWith(target);

    cleanup.resolve();
    await generating;
    await fixture.whenStable();
    const code = row(target).querySelector('code')!;
    expect(code.textContent).toBe(tei);
    expect(code.querySelector('.token.tag')).not.toBeNull();
    expect(highlight).toHaveBeenCalledTimes(1);
    expect(row(target).querySelector('mat-spinner')).toBeNull();
    expect(imageList.imageList[0]).toBe(target);
  });

  it.each(['description', 'image'])('discards pending highlighting when the %s is removed before rendering', async removed => {
    const target = image();
    await showImages(target);
    const highlight = vi.spyOn(Prism, 'highlightElement');
    const { cleanup, generating } = await startTeiWithPendingCleanup(target);
    expect(component['needsHighlight']().size).toBe(1);

    if (removed === 'image') {
      imageList.removeImage(target);
    } else {
      imageList.deleteActiveDescription(target);
    }
    await fixture.whenStable();
    expect(component['needsHighlight']().size).toBe(0);
    cleanup.resolve();
    await generating;
    await fixture.whenStable();
    expect(highlight).not.toHaveBeenCalled();
    if (removed === 'image') {
      expect(fixture.nativeElement.querySelector('.no-images')).not.toBeNull();
      expect(imageList.imageList).toEqual([]);
    } else {
      expect(row(target).querySelector('.no-desc')).not.toBeNull();
      expect(imageList.imageList[0]).toBe(target);
    }
  });

  it('does not restore a removed image or queue its highlighting when an in-flight SDK result commits', async () => {
    const target = image();
    await showImages(target);
    await enableTei();
    const highlight = vi.spyOn(Prism, 'highlightElement');
    const encoded = deferred<AiResult>();
    ai.describeImagesFilesApi.mockResolvedValueOnce({ text: 'Transcription' });
    ai.describeImagesFilesApi.mockReturnValueOnce(encoded.promise);
    const generating = component.generate(target);
    await vi.waitFor(() => expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(2));

    imageList.removeImage(target);
    await fixture.whenStable();
    encoded.resolve({ text: '<body><p>Late TEI result</p></body>' });
    await generating;
    await fixture.whenStable();

    expect(target.descriptions[0].description).toBe('<p>Late TEI result</p>');
    expect(imageList.imageList).toEqual([]);
    expect(fixture.nativeElement.querySelector('.no-images')).not.toBeNull();
    expect(component['needsHighlight']().size).toBe(0);
    expect(highlight).not.toHaveBeenCalled();
  });

  it('uses the existing synchronous export lifetime and forwards the dialog options', async () => {
    await showImages(image([description('Ready to export')]));
    const result = dialogResult<{
      value: boolean;
      selectedExportFormat: string;
      filename: string;
    }>();
    const exportFile = vi.spyOn(TestBed.inject(ExportService), 'exportImageListToFile')
      .mockImplementation(() => expect(component.exporting()).toBe(true));

    component.export();
    expect(component.exporting()).toBe(false);
    const dialogConfig = vi.mocked(TestBed.inject(MatDialog).open).mock.calls[0][1];
    expect(dialogConfig).toEqual(expect.objectContaining({ data: { teiTranscriptions: false } }));

    result.next({ value: true, selectedExportFormat: 'csv', filename: 'reviewed-images' });
    result.complete();
    await fixture.whenStable();
    expect(exportFile).toHaveBeenCalledWith('csv', 'reviewed-images');
    expect(component.exporting()).toBe(false);
    expect(buttonWithText('Export').disabled).toBe(false);
  });

  it('renders batch cancellation immediately and does not overwrite it with a late result', async () => {
    const first = image();
    const second = image();
    await showImages(first, second);
    settings.updateSelectedTaskType('transcriptionBatchTei');
    settings.updateBatchSize(1);
    await fixture.whenStable();
    const lateResult = deferred<AiResult>();
    ai.describeImagesFilesApi
      .mockReturnValueOnce(lateResult.promise)
      .mockResolvedValueOnce({ text: '<body><p>Second batch</p></body>' });

    const generating = component.generateAll();
    await vi.waitFor(() => expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(1));
    await fixture.whenStable();
    expect(component.batchResults.results().map(batch => batch.status)).toEqual(['generating', 'pending']);
    expect(fixture.nativeElement.querySelector('.batch-generating')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.batch-pending')).not.toBeNull();
    expect(first.generating).toBe(true);
    expect(component.generatingAll()).toBe(true);

    snackActions[0].next();
    await fixture.whenStable();
    expect(component.generating()).toBe(false);
    expect(component.generatingAll()).toBe(true);
    expect(component.batchResults.results().map(batch => batch.status)).toEqual(['cancelled', 'cancelled']);
    expect(fixture.nativeElement.querySelectorAll('.batch-cancelled')).toHaveLength(2);
    expect(first.generating).toBe(false);
    expect(second.generating).toBe(false);
    expect(batchButton(0, 'Regenerate').getAttribute('aria-disabled')).toBe('true');
    expect(buttonWithText('Generate TEI transcriptions').disabled).toBe(true);
    await component.transcribeAndTeiEncodeBatch(component.batchResults.results()[0]);
    await component.generateAll();
    expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(1);

    lateResult.resolve({ text: '<body><p>Late first batch</p></body>' });
    await generating;
    await fixture.whenStable();
    expect(component.generatingAll()).toBe(false);
    expect(batchButton(0, 'Regenerate').getAttribute('aria-disabled')).not.toBe('true');
    expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(1);
    expect(component.batchResults.results().map(batch => batch.status)).toEqual(['cancelled', 'cancelled']);
    expect(component.batchResults.results()[0].teiBody).toBeUndefined();
    expect(first.generating).toBe(false);
    expect(second.generating).toBe(false);
  });

  it('blocks regeneration after cancelling batch two so all five automatic batches are processed', async () => {
    await showImages(...Array.from({ length: 5 }, () => image()));
    settings.updateSelectedTaskType('transcriptionBatchTei');
    settings.updateBatchSize(1);
    await fixture.whenStable();
    settings.updateSelectedModelId('gpt-5.6-terra');
    await fixture.whenStable();
    const requests = Array.from({ length: 6 }, () => deferred<AiResult>());
    for (const request of requests) ai.describeImagesFilesApi.mockReturnValueOnce(request.promise);
    const batchRow = (index: number): HTMLElement => fixture.nativeElement.querySelectorAll('.batch-result-wrapper')[index];
    const regenerateButton = (index: number): HTMLButtonElement => batchRow(index).querySelector('button[aria-label="Regenerate"]')!;

    const automaticRun = component.generateAll();
    await vi.waitFor(() => expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(1));
    requests[0].resolve({ text: '<body><p>First batch</p></body>' });
    await vi.waitFor(() => expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(2));
    await fixture.whenStable();

    batchRow(1).querySelector<HTMLButtonElement>('button[aria-label="Cancel batch"]')!.click();
    requests[1].resolve({ text: '<body><p>Late cancelled batch</p></body>' });
    await vi.waitFor(() => expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(3));
    await fixture.whenStable();
    const cancelledBatch = component.batchResults.results()[1];
    const blockedButton = regenerateButton(1);
    expect(cancelledBatch.status).toBe('cancelled');
    expect(regenerateButton(0).getAttribute('aria-disabled')).toBe('true');
    expect(blockedButton.getAttribute('aria-disabled')).toBe('true');

    blockedButton.click();
    await component.transcribeAndTeiEncodeBatch(cancelledBatch);
    await fixture.whenStable();
    expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(3);
    expect(component.generating()).toBe(true);
    expect(component.generatingAll()).toBe(true);
    expect(component.batchResults.results()[1].status).toBe('cancelled');

    requests[2].resolve({ text: '<body><p>Third batch</p></body>' });
    await vi.waitFor(() => expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(4));
    requests[3].resolve({ text: '<body><p>Fourth batch</p></body>' });
    await vi.waitFor(() => expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(5));
    await fixture.whenStable();
    expect(component.batchResults.results()[4].status).toBe('generating');
    expect(regenerateButton(1)).toBe(blockedButton);
    expect(blockedButton.getAttribute('aria-disabled')).toBe('true');

    requests[4].resolve({ text: '<body><p>Fifth batch</p></body>' });
    await automaticRun;
    await fixture.whenStable();
    expect(component.batchResults.results().map(batch => batch.status))
      .toEqual(['success', 'cancelled', 'success', 'success', 'success']);
    expect(component.generating()).toBe(false);
    expect(component.generatingAll()).toBe(false);
    expect(regenerateButton(1)).toBe(blockedButton);
    expect(blockedButton.getAttribute('aria-disabled')).not.toBe('true');

    blockedButton.click();
    await vi.waitFor(() => expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(6));
    await fixture.whenStable();
    expect(component.batchResults.results()[1].status).toBe('generating');
    expect(component.generatingAll()).toBe(false);
    expect(regenerateButton(0).getAttribute('aria-disabled')).not.toBe('true');

    requests[5].resolve({ text: '<body><p>Regenerated second batch</p></body>' });
    await vi.waitFor(() => expect(component.generating()).toBe(false));
    await fixture.whenStable();
    expect(component.batchResults.results()[1].status).toBe('success');
    expect(component.batchResults.results()[1].teiBody).toContain('Regenerated second batch');
    expect(regenerateButton(0).getAttribute('aria-disabled')).not.toBe('true');
  });

  it('enables regeneration after an automatic batch fails', async () => {
    await showImages(image());
    settings.updateSelectedTaskType('transcriptionBatchTei');
    settings.updateBatchSize(1);
    await fixture.whenStable();
    const request = deferred<AiResult>();
    ai.describeImagesFilesApi.mockReturnValueOnce(request.promise);

    const automaticRun = component.generateAll();
    await vi.waitFor(() => expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(1));
    request.resolve({ text: '', error: { code: 500, message: 'Provider error' } });
    await automaticRun;
    await fixture.whenStable();
    expect(component.batchResults.results()[0].status).toBe('error');
    expect(component.generating()).toBe(false);
    expect(component.generatingAll()).toBe(false);
    const regenerateButton: HTMLButtonElement = fixture.nativeElement.querySelector('button[aria-label="Regenerate"]');
    expect(regenerateButton.getAttribute('aria-disabled')).not.toBe('true');

    regenerateButton.click();
    await vi.waitFor(() => expect(component.generating()).toBe(false));
    await fixture.whenStable();
    expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(2);
    expect(component.batchResults.results()[0].status).toBe('success');
  });

  it.each([0, 1])('keeps concurrent manual regeneration active when batch %i finishes first', async finishedIndex => {
    await showCompletedBatches();
    const requests = [deferred<AiResult>(), deferred<AiResult>()];
    for (const request of requests) ai.describeImagesFilesApi.mockReturnValueOnce(request.promise);
    batchButton(0, 'Regenerate').click();
    await fixture.whenStable();
    expect(component.generating()).toBe(true);
    expect(component.generatingAll()).toBe(false);
    expect(batchButton(1, 'Regenerate').getAttribute('aria-disabled')).not.toBe('true');

    const secondButton = batchButton(1, 'Regenerate');
    secondButton.click();
    secondButton.click();
    await fixture.whenStable();
    expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(2);
    expect(component.batchResults.results().map(batch => batch.status)).toEqual(['generating', 'generating']);
    expect(snackBar.open.mock.lastCall?.[0]).toBe('Regenerating 2 TEI batches');
    expect(buttonWithText('Generate TEI transcriptions').disabled).toBe(true);
    await component.generateAll();
    expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(2);

    requests[finishedIndex].resolve({ text: `<body><p>Regenerated batch ${finishedIndex + 1}</p></body>` });
    await vi.waitFor(() => expect(component.batchResults.results()[finishedIndex].status).toBe('success'));
    await fixture.whenStable();
    expect(component.generating()).toBe(true);
    expect(component.batchResults.results()[1 - finishedIndex].status).toBe('generating');
    expect(snackBar.open.mock.lastCall?.[0]).toBe('Regenerating 1 TEI batch');
    expect(batchButton(finishedIndex, 'Regenerate').getAttribute('aria-disabled')).not.toBe('true');
    expect(buttonWithText('Generate TEI transcriptions').disabled).toBe(true);
    expect(buttonWithText('Export TEI transcriptions').disabled).toBe(true);

    requests[1 - finishedIndex].resolve({ text: `<body><p>Regenerated batch ${2 - finishedIndex}</p></body>` });
    await vi.waitFor(() => expect(component.generating()).toBe(false));
    await fixture.whenStable();
    expect(component.batchResults.results().map(batch => batch.status)).toEqual(['success', 'success']);
    expect(component.batchResults.results()[0].teiBody).toContain('Regenerated batch 1');
    expect(component.batchResults.results()[1].teiBody).toContain('Regenerated batch 2');
    expect(buttonWithText('Generate TEI transcriptions').disabled).toBe(false);
    expect(buttonWithText('Export TEI transcriptions').disabled).toBe(false);
    expect(snackBar.open.mock.results.at(-1)?.value.dismiss).toHaveBeenCalledOnce();
  });

  it.each(['one batch', 'all batches'] as const)('cancels %s during concurrent regeneration without late results overwriting cancellation', async cancellation => {
    const batches = await showCompletedBatches();
    const requests = [deferred<AiResult>(), deferred<AiResult>()];
    for (const request of requests) ai.describeImagesFilesApi.mockReturnValueOnce(request.promise);
    const runs = batches.map(batch => component.transcribeAndTeiEncodeBatch(batch));
    await fixture.whenStable();
    const signals = ai.describeImagesFilesApi.mock.calls.map(call => call[3]!.signal!);

    if (cancellation === 'all batches') {
      snackActions.at(-1)!.next();
    } else {
      batchButton(0, 'Cancel batch').click();
    }
    await fixture.whenStable();
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(cancellation === 'all batches');
    expect(component.batchResults.results().map(batch => batch.status))
      .toEqual(['cancelled', cancellation === 'all batches' ? 'cancelled' : 'generating']);
    expect(component.generating()).toBe(true);
    expect(component.generatingAll()).toBe(false);
    await component.generateAll();
    await component.transcribeAndTeiEncodeBatch(batches[0]);
    expect(ai.describeImagesFilesApi).toHaveBeenCalledTimes(2);

    requests[0].resolve({ text: '<body><p>Late cancelled batch</p></body>' });
    await runs[0];
    await fixture.whenStable();
    expect(component.batchResults.results()[0].status).toBe('cancelled');
    expect(component.batchResults.results()[0].teiBody).toBe('<p>Batch 1</p>');
    expect(component.generating()).toBe(true);

    requests[1].resolve({ text: '<body><p>Second regenerated batch</p></body>' });
    await runs[1];
    await fixture.whenStable();
    expect(component.batchResults.results()[1].status).toBe(cancellation === 'all batches' ? 'cancelled' : 'success');
    expect(component.generating()).toBe(false);
    expect(buttonWithText('Generate TEI transcriptions').disabled).toBe(false);
  });

  it('preserves another manual regeneration and its progress snackbar when one batch fails', async () => {
    const batches = await showCompletedBatches();
    const requests = [deferred<AiResult>(), deferred<AiResult>()];
    for (const request of requests) ai.describeImagesFilesApi.mockReturnValueOnce(request.promise);
    const runs = batches.map(batch => component.transcribeAndTeiEncodeBatch(batch));
    requests[0].resolve({ text: '', error: { code: 500, message: 'Provider error' } });
    await runs[0];
    await fixture.whenStable();
    expect(component.batchResults.results()[0].status).toBe('error');
    expect(component.batchResults.results()[1].status).toBe('generating');
    expect(component.generating()).toBe(true);
    expect(component.generatingAll()).toBe(false);
    expect(batchButton(0, 'Regenerate').getAttribute('aria-disabled')).not.toBe('true');

    snackDismissals.at(-1)!.next();
    expect(snackBar.open.mock.lastCall?.[0]).toBe('Regenerating 1 TEI batch');
    requests[1].resolve({ text: '<body><p>Second regenerated batch</p></body>' });
    await runs[1];
    await fixture.whenStable();
    expect(component.batchResults.results().map(batch => batch.status)).toEqual(['error', 'success']);
    expect(component.generating()).toBe(false);
  });

  it('keeps generation busy until the remaining manual batch upload cleanup settles', async () => {
    const batches = await showCompletedBatches();
    imageList.imageList[0].filesApiId = 'uploaded-first-batch';
    const requests = [deferred<AiResult>(), deferred<AiResult>()];
    const cleanup = deferred<void>();
    for (const request of requests) ai.describeImagesFilesApi.mockReturnValueOnce(request.promise);
    ai.deleteUploadedFile.mockReturnValueOnce(cleanup.promise);
    const runs = batches.map(batch => component.transcribeAndTeiEncodeBatch(batch));

    requests[0].resolve({ text: '<body><p>First regenerated batch</p></body>' });
    await vi.waitFor(() => expect(ai.deleteUploadedFile).toHaveBeenCalledOnce());
    requests[1].resolve({ text: '<body><p>Second regenerated batch</p></body>' });
    await runs[1];
    await fixture.whenStable();
    expect(component.generating()).toBe(true);
    expect(component.generatingAll()).toBe(false);
    expect(component.batchResults.results().map(batch => batch.status)).toEqual(['generating', 'success']);
    expect(buttonWithText('Generate TEI transcriptions').disabled).toBe(true);

    cleanup.resolve();
    await runs[0];
    await fixture.whenStable();
    expect(component.generating()).toBe(false);
    expect(component.batchResults.results().map(batch => batch.status)).toEqual(['success', 'success']);
    expect(buttonWithText('Generate TEI transcriptions').disabled).toBe(false);
  });
});
