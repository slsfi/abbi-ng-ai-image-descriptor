import { Injectable } from '@angular/core';

import { ModelProvider } from '../../assets/config/models';

@Injectable({
  providedIn: 'root'
})
export class ApiKeysService {
  private keys = new Map<ModelProvider, string>();
  private validated = new Set<ModelProvider>();

  getKey(provider: ModelProvider): string {
    return this.keys.get(provider) ?? '';
  }

  setKey(provider: ModelProvider, key: string) {
    const prev = this.keys.get(provider);
    this.keys.set(provider, key);
    if (prev !== key) {
      this.validated.delete(provider);
    }
  }

  markValidated(provider: ModelProvider): void {
    this.validated.add(provider);
  }

  isValidated(provider: ModelProvider): boolean {
    return this.validated.has(provider);
  }

  clear(provider: ModelProvider): void {
    this.keys.delete(provider);
    this.validated.delete(provider);
  }

  clearAll(): void {
    this.keys.clear();
    this.validated.clear();
  }
}
