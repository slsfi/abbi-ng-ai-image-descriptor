import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { EditDescriptionDialogComponent } from './edit-description-dialog.component';

describe('EditDescriptionDialogComponent', () => {
  let component: EditDescriptionDialogComponent;
  let fixture: ComponentFixture<EditDescriptionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDescriptionDialogComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            imageObj: {
              id: 'img-1',
              base64Image: 'data:image/png;base64,AAAA',
              width: 100,
              height: 100,
              activeDescriptionIndex: 0,
              descriptions: [
                {
                  description: 'Test description',
                  teiEncoded: false,
                },
              ],
            },
          },
        },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      ],
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditDescriptionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
