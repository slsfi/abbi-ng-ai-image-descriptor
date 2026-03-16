import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

import { SettingsFormComponent } from './settings-form.component';
import { SettingsService } from '../../services/settings.service';

describe('SettingsFormComponent', () => {
  let component: SettingsFormComponent;
  let fixture: ComponentFixture<SettingsFormComponent>;
  let settings: SettingsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SettingsFormComponent);
    component = fixture.componentInstance;
    settings = TestBed.inject(SettingsService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the spellcheck toggle only for batched TEI transcription', () => {
    settings.updateSelectedTaskType('altText');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Spellcheck transcription');
    expect(fixture.nativeElement.textContent).not.toContain('Show intermediate spellcheck results');

    settings.updateSelectedTaskType('transcriptionBatchTei');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Spellcheck transcription');
    expect(fixture.nativeElement.textContent).toContain('Show intermediate spellcheck results');
  });

  it('updates the spellcheck transcription setting', () => {
    component.setSpellcheckTranscription({ checked: true } as MatSlideToggleChange);
    expect(settings.spellcheckTranscription()).toBeTrue();
  });

  it('updates the intermediate batch result visibility setting', () => {
    component.setShowIntermediateBatchResults({ checked: true } as MatSlideToggleChange);
    expect(settings.showIntermediateBatchResults()).toBeTrue();
  });
});
