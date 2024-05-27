import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ConfirmActionDialogComponent, DialogData } from './confirm-action-dialog.component';

describe('ConfirmActionDialogComponent', () => {
  let component: ConfirmActionDialogComponent;
  let fixture: ComponentFixture<ConfirmActionDialogComponent>;
  const mockDialogData: DialogData = {
    title: 'Confirm Action',
    body: 'Are you sure you want to perform this action?',
    confirmLabel: 'Yes',
    cancelLabel: 'No'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatButtonModule,
        NoopAnimationsModule,
        ConfirmActionDialogComponent
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: MatDialogRef, useValue: {} }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConfirmActionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
