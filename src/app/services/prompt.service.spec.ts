import { TestBed } from '@angular/core/testing';

import { TASK_TYPES_BY_ID } from '../../assets/config/prompts';
import { PromptService } from './prompt.service';

describe('PromptService', () => {
  let service: PromptService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PromptService);
  });

  it('returns the original prompt when there is no override', () => {
    const original = TASK_TYPES_BY_ID.transcriptionBatchTei.variants[0].prompt;

    expect(service.getPrompt('transcriptionBatchTei', 'default')).toBe(original);
    expect(service.hasCustomPrompt('transcriptionBatchTei', 'default')).toBeFalse();
  });

  it('returns a customized prompt after one is set', () => {
    service.setCustomPrompt('transcriptionBatchTei', 'default', 'Custom prompt');

    expect(service.getPrompt('transcriptionBatchTei', 'default')).toBe('Custom prompt');
    expect(service.hasCustomPrompt('transcriptionBatchTei', 'default')).toBeTrue();
  });

  it('restores the original prompt when an override is reset', () => {
    const original = TASK_TYPES_BY_ID.transcriptionBatchTei.variants[0].prompt;

    service.setCustomPrompt('transcriptionBatchTei', 'default', 'Custom prompt');
    service.resetCustomPrompt('transcriptionBatchTei', 'default');

    expect(service.getPrompt('transcriptionBatchTei', 'default')).toBe(original);
    expect(service.hasCustomPrompt('transcriptionBatchTei', 'default')).toBeFalse();
  });

  it('removes an override when saving the original prompt text', () => {
    const original = TASK_TYPES_BY_ID.transcriptionBatchTei.variants[0].prompt;

    service.setCustomPrompt('transcriptionBatchTei', 'default', 'Custom prompt');
    service.setCustomPrompt('transcriptionBatchTei', 'default', original);

    expect(service.getPrompt('transcriptionBatchTei', 'default')).toBe(original);
    expect(service.hasCustomPrompt('transcriptionBatchTei', 'default')).toBeFalse();
  });
});
