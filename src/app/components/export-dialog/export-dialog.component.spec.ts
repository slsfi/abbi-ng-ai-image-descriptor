import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ExportDialogComponent } from './export-dialog.component';

describe('ExportDialogComponent', () => {
  let component: ExportDialogComponent;
  let fixture: ComponentFixture<ExportDialogComponent>;
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [ExportDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { teiTranscriptions: false },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('updates filename validity and format suffix, then exports the ngModel values', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('mat-form-field input');
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const exportButton = Array.from(buttons).find(button => button.textContent?.trim() === 'Export')!;

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(exportButton.disabled).toBe(true);

    input.value = 'reviewed-images';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const formats: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('mat-radio-button');
    const csv = Array.from(formats).find(option => option.textContent?.includes('Comma-separated'))!;
    csv.querySelector('input')!.click();
    await fixture.whenStable();

    expect(exportButton.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('[matTextSuffix]').textContent).toBe('.csv');
    exportButton.click();
    expect(close).toHaveBeenCalledWith({
      value: true, selectedExportFormat: 'csv', filename: 'reviewed-images'
    });
  });

  it('returns the existing cancel result', () => {
    fixture.nativeElement.querySelector('button').click();
    expect(close).toHaveBeenCalledWith({ value: false });
  });
});
