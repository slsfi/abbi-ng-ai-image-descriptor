import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmActionDialogComponent } from './confirm-action-dialog.component';

describe('ConfirmActionDialogComponent', () => {
  let component: ConfirmActionDialogComponent;
  let fixture: ComponentFixture<ConfirmActionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmActionDialogComponent]
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
