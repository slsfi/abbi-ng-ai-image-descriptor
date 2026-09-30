import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { EditDescriptionDialogComponent } from './edit-description-dialog.component';
import { ImageData } from '../../types/image-data.types';

describe('EditDescriptionDialogComponent', () => {
  let fixture: ComponentFixture<EditDescriptionDialogComponent>;
  let image: ImageData;
  let close: ReturnType<typeof vi.fn>;

  function button(label: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.trim() === label)!;
  }

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(EditDescriptionDialogComponent);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    close = vi.fn();
    image = {
      id: 0, filename: 'image.png', uploadKey: 'test-upload',
      base64Image: 'data:image/png;base64,AAAA', width: 200, height: 100,
      activeDescriptionIndex: 0, generating: false,
      descriptions: [{
        description: 'Test description', teiEncoded: false,
        model: 'gpt-4.1', inputTokens: 0, outputTokens: 0, cost: 0
      }]
    };
    await TestBed.configureTestingModule({
      imports: [EditDescriptionDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: { imageObj: image } },
        { provide: MatDialogRef, useValue: { close } }
      ]
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', async () => {
    await render();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('returns text edited through ngModel without mutating the original description', async () => {
    await render();
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    textarea.value = 'Edited description';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    button('Save').click();

    expect(close).toHaveBeenCalledWith('Edited description');
    expect(image.descriptions[0].description).toBe('Test description');
  });

  it('renders and highlights edited TEI when preview is toggled, then restores the editor', async () => {
    image.descriptions[0].teiEncoded = true;
    await render();
    const markup = '<body><p>Edited transcription</p></body>';
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    textarea.value = markup;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.toggle-preview-button').click();
    await fixture.whenStable();

    const code: HTMLElement = fixture.nativeElement.querySelector('code');
    expect(code.textContent).toBe(markup);
    expect(code.querySelector('.token.tag')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();

    fixture.nativeElement.querySelector('.toggle-preview-button').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('textarea').value).toBe(markup);
  });

  it('renders zoom, pointer pan, resize clamping, and reset from bound listeners', async () => {
    await render();
    const viewport: HTMLElement = fixture.nativeElement.querySelector('.img-viewport');
    const img: HTMLImageElement = viewport.querySelector('img')!;
    vi.spyOn(img, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 250, 125));
    const viewportRect = vi.spyOn(viewport, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 0, 200, 100));
    const zoomLabel: HTMLElement = fixture.nativeElement.querySelector('[aria-label="Zoom level"]');
    const zoomIn: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Zoom in"]');
    const reset: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Reset zoom"]');

    zoomIn.click();
    await fixture.whenStable();
    expect(zoomLabel.textContent).toBe('125%');
    expect(viewport.classList.contains('zoomed')).toBe(true);
    expect(reset.disabled).toBe(false);

    viewport.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 0, clientY: 0 }));
    viewport.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 10, clientY: 5 }));
    viewport.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    await fixture.whenStable();
    expect(img.style.transform).toBe('translate(10px, 5px) scale(1.25)');

    viewportRect.mockReturnValue(new DOMRect(0, 0, 250, 125));
    window.dispatchEvent(new Event('resize'));
    await fixture.whenStable();
    expect(img.style.transform).toBe('translate(0px, 0px) scale(1.25)');

    viewport.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -1 }));
    await fixture.whenStable();
    expect(zoomLabel.textContent).toBe('150%');
    reset.click();
    await fixture.whenStable();
    expect(zoomLabel.textContent).toBe('100%');
    expect(img.style.transform).toBe('translate(0px, 0px) scale(1)');
    expect(viewport.classList.contains('zoomed')).toBe(false);
    expect(reset.disabled).toBe(true);
  });

  it('cancels without returning the edited text', async () => {
    await render();
    button('Cancel').click();
    expect(close).toHaveBeenCalledWith(null);
  });
});
