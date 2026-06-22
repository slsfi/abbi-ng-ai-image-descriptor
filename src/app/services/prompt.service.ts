import { Injectable, signal } from '@angular/core';

import { TaskTypeId, TASK_TYPES_BY_ID } from '../../assets/config/prompts';

@Injectable({
  providedIn: 'root'
})
export class PromptService {
  private readonly customPrompts = signal<Record<string, string>>({});

  getPrompt(taskType: TaskTypeId, variantId: string): string {
    const key = this.getKey(taskType, variantId);
    return this.customPrompts()[key] ?? this.getOriginalPrompt(taskType, variantId);
  }

  getOriginalPrompt(taskType: TaskTypeId, variantId: string): string {
    const taskConfig = TASK_TYPES_BY_ID[taskType];
    return taskConfig.variants.find(v => v.id === variantId)?.prompt ?? taskConfig.variants[0]?.prompt ?? '';
  }

  hasCustomPrompt(taskType: TaskTypeId, variantId: string): boolean {
    const key = this.getKey(taskType, variantId);
    return Object.prototype.hasOwnProperty.call(this.customPrompts(), key);
  }

  setCustomPrompt(taskType: TaskTypeId, variantId: string, prompt: string): void {
    if (prompt === this.getOriginalPrompt(taskType, variantId)) {
      this.resetCustomPrompt(taskType, variantId);
      return;
    }

    const key = this.getKey(taskType, variantId);
    this.customPrompts.update(prompts => ({
      ...prompts,
      [key]: prompt
    }));
  }

  resetCustomPrompt(taskType: TaskTypeId, variantId: string): void {
    const key = this.getKey(taskType, variantId);
    this.customPrompts.update(prompts => {
      if (!Object.prototype.hasOwnProperty.call(prompts, key)) {
        return prompts;
      }

      const { [key]: _removed, ...rest } = prompts;
      return rest;
    });
  }

  private getKey(taskType: TaskTypeId, variantId: string): string {
    return `${taskType}:${variantId}`;
  }
}
