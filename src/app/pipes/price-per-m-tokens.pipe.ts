import { Pipe, PipeTransform } from '@angular/core';

import { PricePerMTokens } from '../types/model.types';

@Pipe({
  name: 'pricePerMTokens'
})
export class PricePerMTokensPipe implements PipeTransform {
  transform(price: PricePerMTokens | null | undefined): string[] {
    if (price == null) {
      return ['—'];
    }

    // Flat price: number
    if (typeof price === 'number') {
      return [`$${price.toFixed(2)} / 1M tokens`];
    }

    // Tiered price
    const lines: string[] = [];
    const tiers = price.tiers;
    let prevUpTo: number | null = null;

    for (const tier of tiers) {
      const dollars = `$${tier.per1M.toFixed(2)}`;

      if (tier.upToTokens !== null) {
        lines.push(`${dollars} / 1M tokens, prompts <= ${this.formatTokens(tier.upToTokens)} tokens`);
        prevUpTo = tier.upToTokens;
      } else {
        if (prevUpTo == null) {
          lines.push(`${dollars} / 1M tokens, all prompts`);
        } else {
          lines.push(`${dollars} / 1M tokens, prompts > ${this.formatTokens(prevUpTo)} tokens`);
        }
      }
    }

    return lines;
  }

  private formatTokens(tokens: number): string {
    // 200000 -> 200k, 1000000 -> 1M, otherwise locale number
    if (tokens >= 1_000_000 && tokens % 1_000_000 === 0) return `${tokens / 1_000_000}M`;
    if (tokens >= 1_000 && tokens % 1_000 === 0) return `${tokens / 1_000}k`;
    return tokens.toLocaleString('en-US');
  }
}
