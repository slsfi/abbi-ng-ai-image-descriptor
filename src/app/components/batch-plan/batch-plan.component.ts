import { Component, computed, inject, input } from '@angular/core';

import { SettingsService } from '../../services/settings.service';

type BatchPlanItem = {
  index: number;
  count: number;
};

@Component({
  selector: 'batch-plan',
  imports: [
  ],
  templateUrl: './batch-plan.component.html',
  styleUrls: ['./batch-plan.component.scss'],
})
export class BatchPlanComponent {
  readonly settings = inject(SettingsService);

  readonly imageCount = input<number>(0);
  
  readonly batchPlan = computed<BatchPlanItem[]>(() => {
    const imageCount = this.imageCount();
    const size = this.settings.batchSize() || 10;

    if (imageCount <= 0 || size <= 0) {
      return [];
    }

    const batches: BatchPlanItem[] = [];
    for (let i = 0; i < imageCount; i += size) {
      const remaining = imageCount - i;
      batches.push({
        index: batches.length,
        count: remaining >= size ? size : remaining
      });
    }
    return batches;
  });

}
