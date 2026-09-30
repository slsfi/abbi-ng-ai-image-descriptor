import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, Subject } from 'rxjs';

import { GenerateDescriptionsComponent } from './generate-descriptions.component';
import Prism from '../../utils/prism';
import { AiService } from '../../services/ai.service';
import { CostService } from '../../services/cost.service';
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
    await TestBed.configureTestingModule({
      imports: [GenerateDescriptionsComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AiService, useValue: ai },
        { provide: CostService, useValue: costs },
        { provide: MatSnackBar, useValue: { open: () => ({ dismiss: () => {}, onAction: () => EMPTY, afterDismissed: () => EMPTY }) } }
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
    expect(component.generating).toBe(false);
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
    expect(component.generating).toBe(true);

    firstResult.resolve({ text: 'First description' });
    await vi.waitFor(() => expect(ai.describeImage).toHaveBeenCalledTimes(2));
    await fixture.whenStable();
    expectText(first, 'First description', 17);
    expect(row(first).querySelector('mat-spinner')).toBeNull();
    expect(row(second).querySelector('mat-spinner')).not.toBeNull();
    expect(component.generating).toBe(true);
    expect(costs.cumulativeCost()).toBe(0);
    expect(imageList.imageList[0]).toBe(first);
    expect(imageList.imageList[1]).toBe(second);
    expect(first.activeDescriptionIndex).toBe(0);

    secondResult.resolve({ text: 'Second result' });
    await generating;
    await fixture.whenStable();
    expectText(second, 'Second result', 13);
    expect(row(second).querySelector('mat-spinner')).toBeNull();
    expect(component.generating).toBe(false);
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
    subscription.unsubscribe();
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
});
