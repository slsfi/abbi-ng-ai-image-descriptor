import { Component, inject, output } from '@angular/core';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BatchResultsService } from '../../services/batch-results.service';
import { ExportService } from '../../services/export.service';
import { BatchResult } from '../../types/batch-result.types';

@Component({
  selector: 'batch-results',
  imports: [
    ClipboardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './batch-results.component.html',
  styleUrls: ['./batch-results.component.scss'],
})
export class BatchResultsComponent {
  readonly batchResults = inject(BatchResultsService);
  readonly exportService = inject(ExportService);
  readonly snackBar = inject(MatSnackBar);

  generateBatch = output<BatchResult>();

  downloadTei(result: BatchResult) {
    this.exportService.generateXMLFromBatch(result);
  }

  generateOne(result: BatchResult) {
    this.generateBatch.emit(result);
  }

  removeOne(id: string) {
    this.batchResults.remove(id);
  }
}
