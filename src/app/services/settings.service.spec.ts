import { TestBed } from '@angular/core/testing';

import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SettingsService);
  });

  it('defaults spellcheck transcription to false', () => {
    expect(service.spellcheckTranscription()).toBeFalse();
    expect(service.getSettings().spellcheckTranscription).toBeFalse();
  });

  it('includes spellcheck transcription in request settings', () => {
    service.updateSpellcheckTranscription(true);

    expect(service.spellcheckTranscription()).toBeTrue();
    expect(service.getSettings().spellcheckTranscription).toBeTrue();
  });
});
