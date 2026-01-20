import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';

import { BatchResultsService } from '../../services/batch-results.service';
import { BatchResult } from '../../types/batch-result.types';

@Component({
  selector: 'batch-results',
  imports: [
    MatButtonModule,
    MatCardModule
  ],
  templateUrl: './batch-results.component.html',
  styleUrls: ['./batch-results.component.scss'],
})
export class BatchResultsComponent {
  readonly batchResults = inject(BatchResultsService);
  readonly snackBar = inject(MatSnackBar);

  async copyTei(result: BatchResult) {
    const text = result.teiBody ?? '';
    try {
      await navigator.clipboard.writeText(text);
      this.snackBar.open('Copied TEI to clipboard', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Could not copy to clipboard', 'OK', { duration: 2500 });
    }
  }

  downloadTei(result: BatchResult) {
    const tei = result.teiBody ?? '';
    const blob = new Blob([tei], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const date = new Date(result.createdAt).toISOString().slice(0, 10);
    const filename = `tei-batch-${date}-${result.id}.tei.xml`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  clearAll() {
    this.batchResults.clear();
    this.snackBar.open('Cleared batch results', 'OK', { duration: 2000 });
  }

  removeOne(id: string) {
    this.batchResults.remove(id);
  }
}
