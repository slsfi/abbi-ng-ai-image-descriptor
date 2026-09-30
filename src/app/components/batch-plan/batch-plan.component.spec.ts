import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchPlanComponent } from './batch-plan.component';
import { SettingsService } from '../../services/settings.service';

describe('BatchPlanComponent', () => {
  let fixture: ComponentFixture<BatchPlanComponent>;
  let settings: SettingsService;

  function text(): string {
    return fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchPlanComponent],
      providers: [provideZonelessChangeDetection()]
    }).compileComponents();
    fixture = TestBed.createComponent(BatchPlanComponent);
    settings = TestBed.inject(SettingsService);
    await fixture.whenStable();
  });

  it('updates the rendered plan when the input and batch-size signal change', async () => {
    fixture.componentRef.setInput('imageCount', 11);
    await fixture.whenStable();
    expect(text()).toContain('11 images in 2 batches');

    settings.updateBatchSize(4);
    await fixture.whenStable();
    expect(text()).toContain('11 images in 3 batches');
    expect(text()).toContain('batch size max 4 images');

    fixture.componentRef.setInput('imageCount', 1);
    await fixture.whenStable();
    expect(text()).toContain('1 image in 1 batch');
  });
});
