import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { ExportDialogComponent } from './export-dialog.component';

describe('ExportDialogComponent', () => {
  let component: ExportDialogComponent;
  let fixture: ComponentFixture<ExportDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportDialogComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { teiTranscriptions: false },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
