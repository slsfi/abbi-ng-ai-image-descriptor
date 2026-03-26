import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { TranslateDescriptionDialogComponent } from './translate-description-dialog.component';

describe('TranslateDescriptionDialogComponent', () => {
  let component: TranslateDescriptionDialogComponent;
  let fixture: ComponentFixture<TranslateDescriptionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateDescriptionDialogComponent],
      providers: [
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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
