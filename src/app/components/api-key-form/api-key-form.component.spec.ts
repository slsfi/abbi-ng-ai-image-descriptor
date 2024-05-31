import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiKeyFormComponentComponent } from './api-key-form-component.component';

describe('ApiKeyFormComponentComponent', () => {
  let component: ApiKeyFormComponentComponent;
  let fixture: ComponentFixture<ApiKeyFormComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiKeyFormComponentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ApiKeyFormComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
