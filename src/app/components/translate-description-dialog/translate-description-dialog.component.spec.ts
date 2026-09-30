import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { TranslateDescriptionDialogComponent } from './translate-description-dialog.component';

describe('TranslateDescriptionDialogComponent', () => {
  let component: TranslateDescriptionDialogComponent;
  let fixture: ComponentFixture<TranslateDescriptionDialogComponent>;
  let close: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [TranslateDescriptionDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            descriptions: [{ language: 'en' }],
            activeDescriptionIndex: 0,
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(TranslateDescriptionDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('excludes the source language and returns the language selected through ngModel', async () => {
    const options: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('mat-radio-button');
    expect(Array.from(options, option => option.textContent?.trim())).toEqual(['Swedish', 'Finnish']);
    expect(options[0].querySelector('input')!.checked).toBe(true);

    options[1].querySelector('input')!.click();
    await fixture.whenStable();
    expect(options[1].querySelector('input')!.checked).toBe(true);

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    Array.from(buttons).find(button => button.textContent?.trim() === 'Translate')!.click();
    expect(close).toHaveBeenCalledWith('fi');
  });

  it('returns the existing cancel result', () => {
    fixture.nativeElement.querySelector('button').click();
    expect(close).toHaveBeenCalledWith('');
  });
});
