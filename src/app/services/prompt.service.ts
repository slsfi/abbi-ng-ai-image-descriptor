import { Injectable, signal } from '@angular/core';

import { TaskTypeId, TASK_TYPES_BY_ID } from '../../assets/config/prompts';

/**
 * Stores prompt customisations for the current browser session.
 *
 * The bundled prompt files remain the source of truth for original prompts.
 * Custom prompts are keyed by task type and prompt variant, and are intentionally
 * not persisted across page reloads.
 */
@Injectable({
  providedIn: 'root'
})
export class PromptService {
  private readonly customPrompts = signal<Record<string, string>>({});

  /**
   * Returns the prompt currently active for a task variant.
   *
   * If the user has customised the prompt during this session, the custom prompt
   * is returned. Otherwise, the original bundled prompt is returned.
   */
  getPrompt(taskType: TaskTypeId, variantId: string): string {
    const key = this.getKey(taskType, variantId);
    return this.customPrompts()[key] ?? this.getOriginalPrompt(taskType, variantId);
  }

  /**
   * Returns the bundled prompt text for a task variant.
   *
   * Falls back to the first variant prompt if the requested variant id is not
   * present in the task configuration.
   */
  getOriginalPrompt(taskType: TaskTypeId, variantId: string): string {
    const taskConfig = TASK_TYPES_BY_ID[taskType];
    return taskConfig.variants.find(v => v.id === variantId)?.prompt ?? taskConfig.variants[0]?.prompt ?? '';
  }

  /**
   * Indicates whether the selected task variant has a session-only custom prompt.
   */
  hasCustomPrompt(taskType: TaskTypeId, variantId: string): boolean {
    const key = this.getKey(taskType, variantId);
    return Object.prototype.hasOwnProperty.call(this.customPrompts(), key);
  }

  /**
   * Stores a custom prompt for the current session.
   *
   * Saving text that exactly matches the bundled original removes the override,
   * so the task variant returns to using the source prompt.
   */
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

  /**
   * Removes a session-only prompt override for a task variant.
   */
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
