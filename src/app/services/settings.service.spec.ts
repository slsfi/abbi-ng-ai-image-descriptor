import { TestBed } from '@angular/core/testing';

import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('starts with the default temperature of 1.0', () => {
    const service = TestBed.inject(SettingsService);

    expect(service.selectedTemperature()).toBe(1.0);
  });

  it('enables line break encoding by default and includes changes in request settings', () => {
    const service = TestBed.inject(SettingsService);

    expect(service.encodeLineBreakTypes()).toBe(true);
    expect(service.getSettings().encodeLineBreakTypes).toBe(true);

    service.updateEncodeLineBreakTypes(false);
    expect(service.getSettings().encodeLineBreakTypes).toBe(false);

    service.updateEncodeLineBreakTypes(true);
    expect(service.getSettings().encodeLineBreakTypes).toBe(true);
  });

  it('does not change temperature when switching task types', () => {
    const service = TestBed.inject(SettingsService);

    service.updateSelectedTemperature(0.4);
    service.updateSelectedTaskType('transcription');
    expect(service.selectedTemperature()).toBe(0.4);

    service.updateSelectedTaskType('transcriptionBatchTei');
    expect(service.selectedTemperature()).toBe(0.4);

    service.updateSelectedTaskType('altText');
    expect(service.selectedTemperature()).toBe(0.4);
  });

  it('removes short italic highlighting by default and includes changes in request settings', () => {
    const service = TestBed.inject(SettingsService);

    expect(service.getSettings().stripShortPlainItalicHiTags).toBe(true);

    service.updateStripShortPlainItalicHiTags(false);
    expect(service.getSettings().stripShortPlainItalicHiTags).toBe(false);

    service.updateStripShortPlainItalicHiTags(true);
    expect(service.getSettings().stripShortPlainItalicHiTags).toBe(true);
  });

  it('reports temperature as unsupported for Gemini 3.7 Flash', () => {
    const service = TestBed.inject(SettingsService);

    service.updateSelectedModelId('gemini-3.8-flash');

    expect(service.isTemperatureSupported()).toBe(false);
  });
});
