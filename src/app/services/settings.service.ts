import { Injectable, computed, effect, signal, untracked } from '@angular/core';

import { MODELS, ModelId, getModelsForTaskType,
         isModelAllowedForTaskType
        } from '../../assets/config/models';
import { LanguageCode, TaskTypeId, TASK_CONFIGS, TASK_TYPES_BY_ID } from '../../assets/config/prompts';
import { Model } from '../types/model.types';
import { PromptVariant } from '../types/prompt.types';
import { RequestSettings } from '../types/settings.types';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  // --- User-controlled state ---
  selectedTaskType = signal<TaskTypeId>(TASK_CONFIGS[0].taskType);
  readonly selectedVariantId = signal<string>(TASK_CONFIGS[0].variants[0].id);
  readonly selectedModelId = signal<ModelId>(TASK_CONFIGS[0].defaultModel);

  readonly includeFilename = signal<boolean>(true);
  readonly selectedDescLength = signal<number>(175);
  readonly selectedTemperature = signal<number>(1.0);
  readonly teiEncode = signal<boolean>(false);

  // --- Derived config ---
  readonly taskConfigs = signal(TASK_CONFIGS);

  readonly availableModels = computed<Model[]>(() => getModelsForTaskType(this.selectedTaskType()));

  readonly selectedTaskConfig = computed(() => TASK_TYPES_BY_ID[this.selectedTaskType()]);

  readonly selectedModel = computed<Model>(() =>
    MODELS.find(m => m.id === this.selectedModelId()) ?? MODELS[0]
  );

  readonly languages = computed(() => {
    const cfg = this.selectedTaskConfig();

    if (cfg.taskType === 'altText') {
      return cfg.variants
        .filter(v => !!v.languageCode)
        .map(v => ({ code: v.languageCode as LanguageCode, name: v.label }));
    } else {
      return [];
    }
  });

  readonly taskNouns = computed(() =>  this.selectedTaskConfig().nouns);

  readonly selectedVariant = computed<PromptVariant>(() => {
    const cfg = this.selectedTaskConfig();
    const wantedId = this.selectedVariantId();

    return cfg.variants.find(v => v.id === wantedId) ?? cfg.variants[0];
  });

  constructor() {
    // Keep selectedModel compatible with task type
    effect(() => {
      const modelId = this.selectedModelId();

      untracked(() => {
        const taskType = this.selectedTaskType();

        if (!isModelAllowedForTaskType(modelId, taskType)) {
          const compatible = getModelsForTaskType(taskType);
          const fallback = compatible[0]?.id;

          if (fallback) {
            this.selectedModelId.set(fallback);
          }
        }
      });
    });

    // Set default model when task type changes
    effect(() => {
      const cfg = this.selectedTaskConfig();

      const taskDefaultModelId = cfg.defaultModel;
      if (!isModelAllowedForTaskType(taskDefaultModelId, cfg.taskType)) {
        const compatible = getModelsForTaskType(cfg.taskType);
        const fallback = compatible[0]?.id;

        if (fallback) {
          this.selectedModelId.set(fallback);
        }
      } else {
        this.selectedModelId.set(taskDefaultModelId);
      }
    });

    // Apply temperature defaults per task type
    effect(() => {
      const taskType = this.selectedTaskType();
      this.selectedTemperature.set(taskType === 'transcription' ? 0.0 : 1.0);
    });

    // Ensure selectedVariantId is sane when task type changes
    effect(() => {
      const cfg = this.selectedTaskConfig();

      // keep current if exists, otherwise default to first
      const current = this.selectedVariantId();
      const exists = cfg.variants.some(v => v.id === current);
      if (!exists) {
        this.selectedVariantId.set(cfg.variants[0]?.id ?? 'default');
      }
    });
  }

  getSettings(): RequestSettings {
    return {
      model: this.selectedModel(),
      language: this.selectedVariant().languageCode,
      taskType: this.selectedTaskType(),
      temperature: this.selectedTemperature(),
      descriptionLength: this.selectedDescLength(),
      promptVariant: this.selectedVariant(),
      includeFilename: this.includeFilename(),
      teiEncode: this.teiEncode(),
    };
  }

  updateSelectedTaskType(value: TaskTypeId) {
    this.selectedTaskType.set(value);
  }

  updateSelectedVariantId(value: string) {
    this.selectedVariantId.set(value);
  }

  updateSelectedModel(value: Model | undefined) {
    if (value) this.selectedModelId.set(value.id);
  }

  updateSelectedModelId(value: ModelId) {
    this.selectedModelId.set(value);
  }

  updateIncludeFilename(value: boolean) {
    this.includeFilename.set(value);
  }

  updateSelectedDescLength(value: number) {
    this.selectedDescLength.set(value);
  }

  updateSelectedTemperature(value: number) {
    this.selectedTemperature.set(value);
  }

  updateTeiEncode(value: boolean) {
    this.teiEncode.set(value);
  }

}
