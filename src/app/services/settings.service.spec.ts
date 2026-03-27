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
});
