import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { ConfirmActionDialogComponent, DialogData } from './confirm-action-dialog.component';

describe('ConfirmActionDialogComponent', () => {
  let component: ConfirmActionDialogComponent;
  let fixture: ComponentFixture<ConfirmActionDialogComponent>;
  let close: ReturnType<typeof vi.fn>;
  const mockDialogData: DialogData = {
    title: 'Confirm Action',
    body: 'Are you sure you want to perform this action?',
    confirmLabel: 'Yes',
    cancelLabel: 'No'
  };

  beforeEach(async () => {
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [
        MatButtonModule,
        ConfirmActionDialogComponent
      ],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: MatDialogRef, useValue: { close } }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConfirmActionDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each([
    ['Yes', true],
    ['No', false]
  ])('returns the existing %s action result', (label, result) => {
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    Array.from(buttons).find(button => button.textContent?.trim() === label)!.click();
    expect(close).toHaveBeenCalledWith(result);
  });
});
