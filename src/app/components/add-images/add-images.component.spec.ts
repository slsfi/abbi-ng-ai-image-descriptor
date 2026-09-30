import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddImagesComponent } from './add-images.component';
import { ImageListService } from '../../services/image-list.service';
import { ImageData } from '../../types/image-data.types';

describe('AddImagesComponent', () => {
  let component: AddImagesComponent;
  let fixture: ComponentFixture<AddImagesComponent>;
  let imageList: ImageListService;
  let readers: ControlledFileReader[];
  let images: HTMLImageElement[];

  class ControlledFileReader {
    onload: ((event: { target: { result: string } }) => void) | null = null;
    onerror: (() => void) | null = null;
    error = null;
    readAsDataURL = vi.fn<(file: File) => void>();

    constructor() {
      readers.push(this);
    }
  }

  function file(name: string): File {
    return new File(['image'], name, { type: 'image/png' });
  }

  function completeImage(index: number): void {
    readers[index].onload!({ target: { result: 'data:image/png;base64,aW1hZ2U=' } });
    images[index].dispatchEvent(new Event('load'));
  }

  async function render(): Promise<void> {
    // Let Angular's scheduled rendering run with the reset timer still pending.
    await vi.advanceTimersByTimeAsync(1);
    await fixture.whenStable();
  }

  function expectProgress(processed: number, total: number, percentage: number): void {
    const counter: HTMLElement = fixture.nativeElement.querySelector('.progress-wrapper > span');
    const bar: HTMLElement = fixture.nativeElement.querySelector('mat-progress-bar');
    expect(counter.textContent?.replace(/\s+/g, ' ')).toBe(`${processed} / ${total}`);
    expect(bar.getAttribute('aria-valuenow')).toBe(String(percentage));
  }

  beforeEach(async () => {
    readers = [];
    images = [];
    vi.stubGlobal('FileReader', ControlledFileReader);
    vi.stubGlobal('Image', class {
      constructor() {
        const image = document.createElement('img');
        images.push(image);
        return image;
      }
    });

    await TestBed.configureTestingModule({
      imports: [AddImagesComponent],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();

    fixture = TestBed.createComponent(AddImagesComponent);
    component = fixture.componentInstance;
    imageList = TestBed.inject(ImageListService);
    vi.spyOn(imageList, 'resizeImage').mockReturnValue({
      base64: 'data:image/jpeg;base64,cmVzaXplZA==',
      height: 50,
      width: 100,
      mimeType: 'image/jpeg'
    });
    await fixture.whenStable();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders progress after each native image callback before publishing the completed selection', async () => {
    const publish = vi.spyOn(imageList, 'updateImageList');
    const adding = vi.fn();
    component.addingImages.subscribe(adding);
    const loading = component.addImageFiles([file('first.png'), file('second.png'), file('third.png')]);
    await render();
    expectProgress(0, 3, 0);

    completeImage(0);
    await render();
    expectProgress(1, 3, 33);
    expect(publish).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.image-sum').textContent).toContain('total: 0');
    expect(adding.mock.calls).toEqual([[true]]);

    completeImage(1);
    await render();
    expectProgress(2, 3, 67);
    expect(publish).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('mat-progress-bar').classList.contains('finished')).toBe(false);

    completeImage(2);
    await loading;
    await render();
    expectProgress(3, 3, 100);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('mat-progress-bar').classList.contains('finished')).toBe(true);
    expect(adding.mock.calls).toEqual([[true], [false]]);
  });

  it('appends resized images through the existing observable and emits completion for a file-input selection', async () => {
    const existing: ImageData = {
      id: imageList.generateId(), filename: 'existing.png', uploadKey: 'existing-upload',
      base64Image: 'existing', height: 20, width: 40,
      descriptions: [], activeDescriptionIndex: 0, generating: false
    };
    imageList.updateImageList([existing]);
    await render();
    const emissions: ImageData[][] = [];
    const subscription = imageList.imageList$.subscribe(list => emissions.push([...list]));
    const adding = vi.fn();
    component.addingImages.subscribe(adding);
    const selectedFiles = [file('new-first.png'), file('new-second.png')];
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    Object.defineProperty(input, 'files', { value: selectedFiles });

    input.dispatchEvent(new Event('change', { bubbles: true }));
    await render();
    expect(readers[0].readAsDataURL).toHaveBeenCalledWith(selectedFiles[0]);
    completeImage(0);
    await render();
    expect(emissions).toHaveLength(1);
    expect(readers[1].readAsDataURL).toHaveBeenCalledWith(selectedFiles[1]);

    completeImage(1);
    await render();
    expect(emissions).toHaveLength(2);
    expect(emissions[1][0]).toBe(existing);
    expect(emissions[1].map(image => image.filename)).toEqual(['existing.png', 'new-first.png', 'new-second.png']);
    for (const image of emissions[1].slice(1)) {
      expect(image).toMatchObject({
        base64Image: 'data:image/jpeg;base64,cmVzaXplZA==', height: 50, width: 100,
        mimeType: 'image/jpeg', descriptions: [], activeDescriptionIndex: 0, generating: false
      });
      expect(image.uploadKey).toEqual(expect.any(String));
      expect(image.uploadKey.length).toBeGreaterThan(0);
    }
    expect(new Set(emissions[1].map(image => image.id)).size).toBe(3);
    expect(new Set(emissions[1].map(image => image.uploadKey)).size).toBe(3);
    expect(imageList.resizeImage).toHaveBeenCalledTimes(2);
    expect(adding.mock.calls).toEqual([[true], [false]]);
    expectProgress(2, 2, 100);
    expect(fixture.nativeElement.querySelector('.image-sum').textContent).toContain('total: 3');
    subscription.unsubscribe();
  });

  it('renders the delayed progress reset without another event or image-list emission', async () => {
    const publish = vi.spyOn(imageList, 'updateImageList');
    const adding = vi.fn();
    component.addingImages.subscribe(adding);
    const loading = component.addImageFiles([file('image.png')]);
    completeImage(0);
    await loading;
    await render();
    expectProgress(1, 1, 100);

    await vi.advanceTimersByTimeAsync(1000);
    await render();
    expectProgress(0, 0, 0);
    expect(fixture.nativeElement.querySelector('mat-progress-bar').classList.contains('finished')).toBe(false);
    expect(fixture.nativeElement.querySelector('.image-sum').textContent).toContain('total: 1');
    expect(publish).toHaveBeenCalledTimes(1);
    expect(adding.mock.calls).toEqual([[true], [false]]);
  });

  it('cancels the previous reset when another selection begins so new progress remains visible', async () => {
    const adding = vi.fn();
    component.addingImages.subscribe(adding);
    const firstLoading = component.addImageFiles([file('previous.png')]);
    completeImage(0);
    await firstLoading;
    await render();
    expectProgress(1, 1, 100);
    await vi.advanceTimersByTimeAsync(500);

    const nextLoading = component.addImageFiles([file('next-first.png'), file('next-second.png')]);
    await render();
    expectProgress(0, 2, 0);
    completeImage(1);
    await render();
    expectProgress(1, 2, 50);

    await vi.advanceTimersByTimeAsync(1000);
    await render();
    expectProgress(1, 2, 50);
    expect(fixture.nativeElement.querySelector('.image-sum').textContent).toContain('total: 1');
    expect(adding.mock.calls).toEqual([[true], [false], [true]]);

    completeImage(2);
    await nextLoading;
    await render();
    expectProgress(2, 2, 100);
    expect(fixture.nativeElement.querySelector('.image-sum').textContent).toContain('total: 3');
    expect(adding.mock.calls).toEqual([[true], [false], [true], [false]]);
  });
});
