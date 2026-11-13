import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
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

  it('shows the default-on character setting for every task and retains its value when switching tasks', async () => {
    const findToggle = () => fixture.debugElement.queryAll(By.css('mat-slide-toggle'))
      .find(toggle => toggle.nativeElement.textContent.trim() === 'Normalise characters')!;
    const findSwitch = () => findToggle().nativeElement.querySelector('button[role="switch"]') as HTMLButtonElement;

    expect(findSwitch().getAttribute('aria-checked')).toBe('true');
    expect(findToggle().injector.get(MatTooltip).message).toContain('soft hyphens');
    expect(findToggle().injector.get(MatTooltip).message).toContain('fractions and spacing');
    findSwitch().click();
    await fixture.whenStable();
    expect(settings.getSettings().normaliseCharacters).toBe(false);

    for (const taskType of ['transcription', 'transcriptionBatchTei'] as const) {
      settings.updateSelectedTaskType(taskType);
      await fixture.whenStable();
      expect(findSwitch().getAttribute('aria-checked')).toBe('false');
      expect(findToggle().nativeElement.closest('.parameters-wrapper').querySelector('h4').textContent)
        .toBe('Postprocessing');
    }

    findSwitch().click();
    await fixture.whenStable();
    expect(settings.getSettings().normaliseCharacters).toBe(true);
    expect(findSwitch().getAttribute('aria-checked')).toBe('true');
  });

  it('shows the default-on paragraph repair setting only for TEI and retains it across task changes', async () => {
    const findToggle = () => fixture.debugElement.queryAll(By.css('mat-slide-toggle'))
      .find(toggle => toggle.nativeElement.textContent.trim() === 'Repair paragraph breaks across pages');
    const findSwitch = () => findToggle()?.nativeElement.querySelector('button[role="switch"]') as HTMLButtonElement | undefined;

    expect(findToggle()).toBeUndefined();
    settings.updateSelectedTaskType('transcription');
    await fixture.whenStable();
    expect(findToggle()).toBeUndefined();

    settings.updateTeiEncode(true);
    await fixture.whenStable();
    expect(findSwitch()!.getAttribute('aria-checked')).toBe('true');
    expect(findToggle()!.injector.get(MatTooltip).message).toContain('punctuation and capitalization');
    findSwitch()!.click();
    await fixture.whenStable();
    expect(settings.getSettings().repairParagraphBreaksAcrossPages).toBe(false);
    expect(settings.normaliseCharacters()).toBe(true);

    settings.updateTeiEncode(false);
    await fixture.whenStable();
    expect(findToggle()).toBeUndefined();
    settings.updateSelectedTaskType('transcriptionBatchTei');
    await fixture.whenStable();
    expect(findSwitch()!.getAttribute('aria-checked')).toBe('false');

    findSwitch()!.click();
    await fixture.whenStable();
    expect(settings.getSettings().repairParagraphBreaksAcrossPages).toBe(true);
    expect(findSwitch()!.getAttribute('aria-checked')).toBe('true');
  });

  it('shows a default-on line break toggle with a tooltip for batched TEI transcription', async () => {
    const label = 'Encode line break types with @break in <lb/>';
    const findToggle = () => fixture.debugElement.queryAll(By.css('mat-slide-toggle'))
      .find(toggle => toggle.nativeElement.textContent.trim() === label);

    expect(findToggle()).toBeUndefined();
    settings.updateSelectedTaskType('transcription');
    await fixture.whenStable();
    expect(findToggle()).toBeUndefined();

    settings.updateSelectedTaskType('transcriptionBatchTei');
    await fixture.whenStable();
    const toggle = findToggle()!;
    const button: HTMLButtonElement = toggle.nativeElement.querySelector('button[role="switch"]');
    expect(toggle.nativeElement.closest('.parameters-wrapper').querySelector('h3').textContent)
      .toContain('Output settings');
    expect(button.getAttribute('aria-checked')).toBe('true');
    const tooltip = toggle.injector.get(MatTooltip).message;
    expect(tooltip).toContain('break="line"');
    expect(tooltip).toContain('break="word"');
    expect(tooltip).toContain('Changing this setting does not modify existing results.');

    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-checked')).toBe('false');
    expect(settings.getSettings().encodeLineBreakTypes).toBe(false);

    button.click();
    await fixture.whenStable();
    expect(button.getAttribute('aria-checked')).toBe('true');
    expect(settings.getSettings().encodeLineBreakTypes).toBe(true);
  });

  it('shows the shared line break setting only while per-image TEI encoding is enabled', async () => {
    settings.updateSelectedTaskType('transcription');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const findSwitch = (label: string) => Array.from(root.querySelectorAll('mat-slide-toggle'))
      .find(toggle => toggle.textContent?.trim() === label)
      ?.querySelector<HTMLButtonElement>('button[role="switch"]');
    const teiSwitch = findSwitch('TEI encode each image transcription separately')!;
    const lineBreakSwitch = () => findSwitch('Encode line break types with @break in <lb/>');

    expect(teiSwitch.getAttribute('aria-checked')).toBe('false');
    expect(lineBreakSwitch()).toBeUndefined();

    teiSwitch.click();
    await fixture.whenStable();
    expect(settings.teiEncode()).toBe(true);
    expect(teiSwitch.getAttribute('aria-checked')).toBe('true');
    expect(lineBreakSwitch()!.getAttribute('aria-checked')).toBe('true');

    lineBreakSwitch()!.click();
    await fixture.whenStable();
    expect(settings.encodeLineBreakTypes()).toBe(false);

    teiSwitch.click();
    await fixture.whenStable();
    expect(settings.teiEncode()).toBe(false);
    expect(lineBreakSwitch()).toBeUndefined();

    settings.updateTeiEncode(true);
    await fixture.whenStable();
    expect(teiSwitch.getAttribute('aria-checked')).toBe('true');
    expect(lineBreakSwitch()!.getAttribute('aria-checked')).toBe('false');

    settings.updateSelectedTaskType('transcriptionBatchTei');
    await fixture.whenStable();
    expect(lineBreakSwitch()!.getAttribute('aria-checked')).toBe('false');
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

  it('shows the shared italic cleanup toggle for TEI transcription and preserves its value across tasks', async () => {
    const findToggle = () => fixture.debugElement.queryAll(By.css('mat-slide-toggle'))
      .find(toggle => toggle.nativeElement.textContent.replace(/\s+/g, ' ').trim() === 'Remove short <hi rend="italics">');
    const findSwitch = () => findToggle()?.nativeElement.querySelector('button[role="switch"]') as HTMLButtonElement | undefined;

    expect(findToggle()).toBeUndefined();
    settings.updateSelectedTaskType('transcription');
    await fixture.whenStable();
    expect(findToggle()).toBeUndefined();

    settings.updateTeiEncode(true);
    await fixture.whenStable();
    expect(findSwitch()!.getAttribute('aria-checked')).toBe('true');
    expect(findToggle()!.injector.get(MatTooltip).message).toContain('up to 30 characters');
    expect(findToggle()!.injector.get(MatTooltip).message)
      .toContain('Changing this setting does not modify existing results.');

    findSwitch()!.click();
    await fixture.whenStable();
    expect(settings.getSettings().stripShortPlainItalicHiTags).toBe(false);
    expect(settings.encodeLineBreakTypes()).toBe(true);
    expect(findSwitch()!.getAttribute('aria-checked')).toBe('false');

    settings.updateTeiEncode(false);
    await fixture.whenStable();
    expect(findToggle()).toBeUndefined();

    settings.updateSelectedTaskType('transcriptionBatchTei');
    await fixture.whenStable();
    expect(findSwitch()!.getAttribute('aria-checked')).toBe('false');
    findSwitch()!.click();
    await fixture.whenStable();
    expect(settings.getSettings().stripShortPlainItalicHiTags).toBe(true);
    expect(findSwitch()!.getAttribute('aria-checked')).toBe('true');
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
