import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateDescriptionDialogComponent } from './translate-description-dialog.component';

describe('TranslateDescriptionDialogComponent', () => {
  let component: TranslateDescriptionDialogComponent;
  let fixture: ComponentFixture<TranslateDescriptionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateDescriptionDialogComponent]
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
