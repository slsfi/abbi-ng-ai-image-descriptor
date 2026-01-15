import { Injectable, signal } from '@angular/core';

import { AiUsage } from '../types/ai.types';
import { Model, resolvePerMTokensPrice } from '../types/model.types';

@Injectable({
  providedIn: 'root'
})
export class CostService {
  cumulativeCost = signal<number>(0);

  addCost(cost: number) {
    this.cumulativeCost.update((currentTotal: number) => currentTotal + cost);
  }

  updateCostFromResponse(model?: Model, usage?: AiUsage): number {
    if (!model || !usage) return 0;

    const inTokens = usage.inputTokens ?? 0;
    const outTokens = usage.outputTokens ?? 0;
    const inputCost: number = (inTokens / 1000000.0) * resolvePerMTokensPrice(model.inputPrice, inTokens);
    const outputCost: number = (outTokens / 1000000.0) * resolvePerMTokensPrice(model.outputPrice, outTokens);
    const total = inputCost + outputCost;

    this.addCost(total);

    return total;
  }
}
