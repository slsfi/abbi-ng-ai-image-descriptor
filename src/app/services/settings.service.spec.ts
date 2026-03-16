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

  it('defaults showing intermediate batch results to false', () => {
    expect(service.showIntermediateBatchResults()).toBeFalse();
    expect(service.getSettings().showIntermediateBatchResults).toBeFalse();
  });

  it('includes spellcheck transcription in request settings', () => {
    service.updateSpellcheckTranscription(true);

    expect(service.spellcheckTranscription()).toBeTrue();
    expect(service.getSettings().spellcheckTranscription).toBeTrue();
  });

  it('includes intermediate batch result visibility in request settings', () => {
    service.updateShowIntermediateBatchResults(true);

    expect(service.showIntermediateBatchResults()).toBeTrue();
    expect(service.getSettings().showIntermediateBatchResults).toBeTrue();
  });
});
