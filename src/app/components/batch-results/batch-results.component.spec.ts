import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';

import { BatchResultsComponent } from './batch-results.component';
import { EditDescriptionDialogComponent } from '../edit-description-dialog/edit-description-dialog.component';
import { BatchResultsService } from '../../services/batch-results.service';
import { BatchResult } from '../../types/batch-result.types';

describe('BatchResultsComponent', () => {
  let fixture: ComponentFixture<BatchResultsComponent>;
  let results: BatchResultsService;
  let batch: BatchResult;

  function button(label: string): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`button[aria-label="${label}"]`);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchResultsComponent],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(BatchResultsComponent);
    results = TestBed.inject(BatchResultsService);
    batch = {
      id: 'batch-1', createdAt: '2026-09-30T00:00:00.000Z',
      taskType: 'transcriptionBatchTei', imageIds: [0, 1], batchIndex: 1,
      status: 'pending'
    };
    await fixture.whenStable();
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders signal-driven pending, generating, error, cancelled, and success states', async () => {
    expect(fixture.nativeElement.querySelector('.no-results')).not.toBeNull();
    results.add(batch);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.batch-pending')).not.toBeNull();

    results.update(batch.id, { status: 'generating' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.batch-generating')).not.toBeNull();
    expect(button('Cancel batch')).not.toBeNull();

    results.update(batch.id, { status: 'error', error: 'Provider error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.batch-error').textContent).toContain('Provider error');

    results.update(batch.id, { status: 'cancelled', error: 'Cancelled by user.' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.batch-cancelled').textContent).toContain('Cancelled by user.');

    results.update(batch.id, { status: 'success', teiBody: '<body><p>Transcription</p></body>' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.batch-success')).not.toBeNull();
    const code: HTMLElement = fixture.nativeElement.querySelector('code');
    expect(code.textContent).toBe('<body><p>Transcription</p></body>');
    expect(code.querySelector('.token.tag')).not.toBeNull();
  });

  it('updates the preview and highlighting after a deferred edit-dialog result', async () => {
    const edits = new Subject<string | null>();
    vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({
      afterClosed: () => edits.asObservable()
    } as MatDialogRef<EditDescriptionDialogComponent>);
    results.add({ ...batch, status: 'success', teiBody: '<body><p>Original</p></body>' });
    await fixture.whenStable();

    button('Show transcription').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('pre').hidden).toBe(false);
    button('Edit transcription').click();
    await fixture.whenStable();

    edits.next('<body><p>Edited transcription</p></body>');
    await fixture.whenStable();
    const code: HTMLElement = fixture.nativeElement.querySelector('code');
    expect(code.textContent).toBe('<body><p>Edited transcription</p></body>');
    expect(code.querySelector('.token.tag')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('pre').hidden).toBe(false);

    button('Hide transcription').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('pre').hidden).toBe(true);
    edits.complete();
  });

  it('emits regeneration and cancellation requests and renders removal', async () => {
    const regenerate = vi.fn();
    const cancel = vi.fn();
    fixture.componentInstance.generateBatch.subscribe(regenerate);
    fixture.componentInstance.cancelBatch.subscribe(cancel);
    results.add({ ...batch, status: 'success', teiBody: '<body><p>Transcription</p></body>' });
    await fixture.whenStable();

    button('Regenerate').click();
    expect(regenerate).toHaveBeenCalledWith(results.results()[0]);
    results.update(batch.id, { status: 'generating' });
    await fixture.whenStable();
    button('Cancel batch').click();
    expect(cancel).toHaveBeenCalledWith(batch.id);

    results.update(batch.id, { status: 'cancelled' });
    await fixture.whenStable();
    button('Remove').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.no-results')).not.toBeNull();
  });

  it.each(['success', 'error', 'cancelled'] as const)(
    'keeps the %s regenerate button focusable but blocks its action during an automatic run', async status => {
      const regenerate = vi.fn();
      fixture.componentInstance.generateBatch.subscribe(regenerate);
      results.add({ ...batch, status, teiBody: '<body><p>Transcription</p></body>' });
      await fixture.whenStable();
      const regenerateButton = button('Regenerate');

      fixture.componentRef.setInput('regenerationDisabled', true);
      await fixture.whenStable();
      expect(button('Regenerate')).toBe(regenerateButton);
      expect(regenerateButton.getAttribute('aria-disabled')).toBe('true');
      expect(regenerateButton.classList.contains('mat-mdc-button-disabled')).toBe(true);
      expect(regenerateButton.disabled).toBe(false);
      expect(regenerateButton.tabIndex).toBe(0);
      regenerateButton.focus();
      expect(document.activeElement).toBe(regenerateButton);
      const description = document.getElementById(regenerateButton.getAttribute('aria-describedby')!);
      expect(description?.textContent).toBe('Wait until the automatic run finishes before regenerating a batch.');

      regenerateButton.click();
      fixture.componentInstance.generateOne(results.results()[0]);
      expect(regenerate).not.toHaveBeenCalled();

      fixture.componentRef.setInput('regenerationDisabled', false);
      await fixture.whenStable();
      expect(button('Regenerate')).toBe(regenerateButton);
      expect(regenerateButton.getAttribute('aria-disabled')).not.toBe('true');
      expect(regenerateButton.classList.contains('mat-mdc-button-disabled')).toBe(false);
      regenerateButton.click();
      expect(regenerate).toHaveBeenCalledExactlyOnceWith(results.results()[0]);
    }
  );

  it('shows the reason for disabled regeneration on hover', async () => {
    results.add({ ...batch, status: 'cancelled' });
    fixture.componentRef.setInput('regenerationDisabled', true);
    await fixture.whenStable();

    button('Regenerate').dispatchEvent(new MouseEvent('mouseenter'));
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    await vi.waitFor(() => {
      expect(overlay.querySelector('.mat-mdc-tooltip')?.textContent)
        .toContain('Wait until the automatic run finishes before regenerating a batch.');
    });
  });
});
