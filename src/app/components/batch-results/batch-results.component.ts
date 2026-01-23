import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect,
         inject, output, signal, viewChildren
        } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchResultsComponent {
  private readonly dialog = inject(MatDialog);
  readonly batchResults = inject(BatchResultsService);
  readonly exportService = inject(ExportService);
  readonly snackBar = inject(MatSnackBar);

  generateBatch = output<BatchResult>();
  readonly codeEls = viewChildren<ElementRef<HTMLElement>>('codeEl');

  // Cache signature per result id
  private readonly lastSigById = new Map<string, string>();

  readonly teiOpenById = signal<Record<string, boolean>>({});

  constructor() {
    afterRenderEffect(() => {
      // Run Prism to update code blocks after batch results have
      // changed AND Angular has finished updating the DOM.
      // Only code blocks whose teiBody has changed are updated.
      const results = this.batchResults.results();

      // 1) Build a set of ids that changed (cheap signature)
      const changedIds = new Set<string>();

      for (const r of results) {
        const isOpen = this.isTeiOpen(r.id) ? 1 : 0;
        const sig = `${r.updatedAt ?? r.createdAt}:${r.teiBody ? 1 : 0}:${isOpen}`;

        const prev = this.lastSigById.get(r.id);
        if (prev !== sig) {
          this.lastSigById.set(r.id, sig);
          changedIds.add(r.id);
        }
      }

      // 2) Clean up signatures for removed results
      // (prevents memory growth if you remove items)
      const liveIds = new Set(results.map(r => r.id));
      for (const id of this.lastSigById.keys()) {
        if (!liveIds.has(id)) this.lastSigById.delete(id);
      }

      // 3) Highlight only code blocks whose result changed
      if (changedIds.size === 0) return;

      for (const elRef of this.codeEls()) {
        const el = elRef.nativeElement;
        const id = el.getAttribute('data-result-id');
        if (id && changedIds.has(id)) {
          Prism.highlightElement(el);
        }
      }
    });
  }

  isTeiOpen(id: string): boolean {
    return this.teiOpenById()[id] ?? false;
  }

  togglePreview(id: string): void {
    this.teiOpenById.update(curr => ({
      ...curr,
      [id]: !(curr[id] ?? false),
    }));
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
      if (editedTranscription != null) {
        this.batchResults.update(result.id, {
          teiBody: editedTranscription,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  generateOne(result: BatchResult): void {
    this.generateBatch.emit(result);
  }

  removeOne(id: string): void {
    this.teiOpenById.update(curr => {
      const { [id]: _, ...rest } = curr;
      return rest;
    });
    this.batchResults.remove(id);
  }
}
