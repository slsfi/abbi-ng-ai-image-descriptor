import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDescriptionDialogComponent } from './edit-description-dialog.component';

describe('EditDescriptionDialogComponent', () => {
  let component: EditDescriptionDialogComponent;
  let fixture: ComponentFixture<EditDescriptionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDescriptionDialogComponent]
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
