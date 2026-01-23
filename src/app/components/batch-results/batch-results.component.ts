import { AfterViewChecked, Component, ElementRef, QueryList, inject, output, viewChildren } from '@angular/core';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import Prism from '../../utils/prism';
import { EditDescriptionDialogComponent } from '../edit-description-dialog/edit-description-dialog.component';
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
export class BatchResultsComponent implements AfterViewChecked {
  private readonly dialog = inject(MatDialog);
  readonly batchResults = inject(BatchResultsService);
  readonly exportService = inject(ExportService);
  readonly snackBar = inject(MatSnackBar);

  generateBatch = output<BatchResult>();
  readonly codeEls = viewChildren<ElementRef<HTMLElement>>('codeEl');

  private lastHighlightedKey = '';

  ngAfterViewChecked(): void {
    // Build a cheap “signature” that changes when results/bodies change.
    const results = this.batchResults.results();
    const key = results
      .map(r => `${r.id}:${r.status}:${r.teiBody?.length ?? 0}`)
      .join('|');

    if (key === this.lastHighlightedKey) return;
    this.lastHighlightedKey = key;

    // Highlight all visible code blocks
    for (const el of this.codeEls()) {
      Prism.highlightElement(el.nativeElement);
    }
  }

  downloadTei(result: BatchResult): void {
    this.exportService.generateXMLFromBatch(result);
  }

  editOne(result: BatchResult): void {
    const dialogRef = this.dialog.open(EditDescriptionDialogComponent, {
      data: { batchObj: result },
      panelClass: 'editDescriptionDialog'
    });

    dialogRef.afterClosed().subscribe((editedTranscription: string | null | undefined) => {
      if (editedTranscription !== null && editedTranscription !== undefined) {
        result.teiBody = editedTranscription;
      }
    });
  }

  generateOne(result: BatchResult): void {
    this.generateBatch.emit(result);
  }

  removeOne(id: string): void {
    this.batchResults.remove(id);
  }
}
