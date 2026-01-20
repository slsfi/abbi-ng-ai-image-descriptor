import { Injectable, computed, signal } from '@angular/core';

import { BatchResult } from '../types/batch-result.types';

@Injectable({
  providedIn: 'root'
})
export class BatchResultsService {
  readonly results = signal<BatchResult[]>([]);

  readonly hasResults = computed(() => this.results().length > 0);

  clear(): void {
    this.results.set([]);
  }

  add(result: BatchResult): void {
    this.results.update(arr => [result, ...arr]); // newest first
  }

  update(id: string, patch: Partial<BatchResult>): void {
    this.results.update(arr =>
      arr.map(r => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  remove(id: string): void {
    this.results.update(arr => arr.filter(r => r.id !== id));
  }
}
