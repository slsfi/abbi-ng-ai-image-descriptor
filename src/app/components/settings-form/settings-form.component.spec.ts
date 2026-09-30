import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

import { SettingsFormComponent } from './settings-form.component';
import { SettingsService } from '../../services/settings.service';
import { PromptService } from '../../services/prompt.service';

describe('SettingsFormComponent', () => {
  let component: SettingsFormComponent;
  let fixture: ComponentFixture<SettingsFormComponent>;
  let settings: SettingsService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsFormComponent],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SettingsFormComponent);
    component = fixture.componentInstance;
    settings = TestBed.inject(SettingsService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders task, model, and batch-size changes from the existing signals', async () => {
    settings.updateSelectedTaskType('transcriptionBatchTei');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.model-description').textContent)
      .toBe(settings.selectedTaskConfig().taskDescription);
    expect(fixture.nativeElement.querySelector('.prompt-editor-wrapper')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.include-filename')).toBeNull();

    const model = settings.availableModels().find(model => model.id !== settings.selectedModel().id)!;
    settings.updateSelectedModel(model);
    settings.updateBatchSize(7);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.model-details-wrapper h4').textContent)
      .toContain(model.name);
    expect(fixture.nativeElement.querySelector('mat-select[name="model"]').textContent)
      .toContain(model.name);
    expect(fixture.nativeElement.querySelector('input[matSliderThumb]').value).toBe('7');
    expect(fixture.nativeElement.querySelector('.slider-value-label').textContent).toBe('7 images');
  });

  it('renders the customised prompt indicator after the real editor dialog saves', async () => {
    settings.updateSelectedTaskType('transcriptionBatchTei');
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.prompt-editor-wrapper button').click();
    await fixture.whenStable();

    const dialogRef = TestBed.inject(MatDialog).openDialogs[0];
    const closed = firstValueFrom(dialogRef.afterClosed());
    const dialog: HTMLElement = document.querySelector('mat-dialog-container')!;
    const textarea = dialog.querySelector('textarea')!;
    textarea.value = 'Custom batch transcription instructions';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    Array.from(dialog.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === 'Save')!.click();
    await closed;
    await fixture.whenStable();

    expect(TestBed.inject(PromptService).getPrompt('transcriptionBatchTei', 'default'))
      .toBe('Custom batch transcription instructions');
    expect(fixture.nativeElement.querySelector('.prompt-customised-hint').textContent)
      .toContain('Customised');
  });
});
