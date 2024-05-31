import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenerateDescriptionsComponent } from './generate-descriptions.component';

describe('GenerateDescriptionsComponent', () => {
  let component: GenerateDescriptionsComponent;
  let fixture: ComponentFixture<GenerateDescriptionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenerateDescriptionsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GenerateDescriptionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
