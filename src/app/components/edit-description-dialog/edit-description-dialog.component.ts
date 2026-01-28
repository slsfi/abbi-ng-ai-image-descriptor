import { Component, ElementRef, HostListener, OnInit, ViewChild,
         afterNextRender, afterRenderEffect, computed, inject, signal,
         viewChild
        } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import { MAT_DIALOG_DATA, MatDialogClose,
         MatDialogContent, MatDialogRef
        } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import Prism from '../../utils/prism';
import { UpperFirstLetterPipe } from '../../pipes/upper-first-letter.pipe';
import { ImageListService } from '../../services/image-list.service';
import { SettingsService } from '../../services/settings.service';
import { BatchResult } from '../../types/batch-result.types';
import { DescriptionData } from '../../types/description-data.types';
import { ImageData } from '../../types/image-data.types';

export interface EditDescriptionDialogData {
  imageObj?: ImageData,
  batchObj?: BatchResult
}

@Component({
  selector: 'edit-description-dialog',
  imports: [
    FormsModule,
    DecimalPipe,
    MatButtonModule,
    MatDialogClose,
    MatDialogContent,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    TextFieldModule,
    UpperFirstLetterPipe
  ],
  templateUrl: './edit-description-dialog.component.html',
  styleUrl: './edit-description-dialog.component.scss'
})
export class EditDescriptionDialogComponent implements OnInit {
  data = inject<EditDescriptionDialogData>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<EditDescriptionDialogComponent>);
  imageListService = inject(ImageListService);
  settings = inject(SettingsService);

  readonly codeEl = viewChild<ElementRef<HTMLElement>>('codeElEditDialog');

  imageObj?: ImageData = this.data.imageObj;
  batchObj?: BatchResult = this.data.batchObj;

  activeDescriptionData?: DescriptionData = this.imageObj?.descriptions[this.imageObj.activeDescriptionIndex];
  editedDescription: string = this.activeDescriptionData?.description ?? this.batchObj?.teiBody ?? '';
  teiEncoding: boolean = (this.activeDescriptionData?.teiEncoded || this.batchObj !== undefined);

  dialogImages: ImageData[] = (this.imageObj !== undefined)
    ? [this.imageObj]
    : this.imageListService.imageList.filter(
        (img: ImageData) => this.batchObj?.imageIds.includes(img.id)
      );
  
  previewShown = signal<boolean>(false);
  activeImage = signal<number>(0);

  aspectRatio = computed<number>(() => {
    const imageIndex = this.activeImage();
    if (this.dialogImages.length > 0) {
      const image = this.dialogImages[imageIndex];
      return (image.width / image.height);
    } else {
      return 1.333;
    }
  });

  // Zoom / pan
  zoom = 1;
  readonly minZoom = 1;
  readonly maxZoom = 5;
  readonly zoomStep = 0.25;

  panX = 0; // px
  panY = 0; // px

  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private panStartX = 0;
  private panStartY = 0;

  @ViewChild('autosize') autosize?: CdkTextareaAutosize;
  @ViewChild('imgViewport') imgViewport?: ElementRef<HTMLDivElement>;
  @ViewChild('imgEl') imgEl?: ElementRef<HTMLImageElement>;

  @HostListener('window:resize')
  onResize(): void {
    this.clampPan();
  }

  constructor() {
    // Wait for content to render, then trigger textarea resize.
    afterNextRender({
      write: () => {
        this.autosize?.resizeToFitContent(true);
      }
    });

    afterRenderEffect(() => {
      // Run Prism to update code block after previewShown has
      // changed, the preview is shown AND Angular has finished
      // updating the DOM.
      const previewShown = this.previewShown();
      const elRef = this.codeEl();
      if (!previewShown || !elRef) return;

      Prism.highlightElement(elRef.nativeElement);
    });
  }

  ngOnInit(): void {
    if (!this.imageObj && !this.batchObj) {
      console.error('Either an ImageData or BatchResult object needs to be passed to EditDescriptionDialogComponent as dialog data.');
      this.dialogRef.close(null);
    }
  }

  nextImage(): void {
    const currentIndex = this.activeImage();
    this.activeImage.set(
      (currentIndex < (this.dialogImages.length - 1)) ? currentIndex + 1 : 0
    );
  }

  previousImage(): void {
    const currentIndex = this.activeImage();
    this.activeImage.set(
      (currentIndex > 0) ? currentIndex - 1 : this.dialogImages.length - 1
    );
  }

  zoomIn(): void {
    this.setZoom(this.zoom + this.zoomStep);
  }

  zoomOut(): void {
    this.setZoom(this.zoom - this.zoomStep);
  }

  resetZoom(): void {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
  }

  private setZoom(next: number): void {
    const clamped = Math.min(this.maxZoom, Math.max(this.minZoom, Number(next.toFixed(2))));
    if (clamped === this.zoom) return;

    this.zoom = clamped;
    if (this.zoom === 1) {
      this.panX = 0;
      this.panY = 0;
    } else {
      // keep pan within bounds after zoom changes
      this.clampPan();
    }
  }

  // Drag to pan
  onPointerDown(ev: PointerEvent): void {
    if (this.zoom <= 1) return;

    this.dragging = true;
    this.dragStartX = ev.clientX;
    this.dragStartY = ev.clientY;
    this.panStartX = this.panX;
    this.panStartY = this.panY;

    // capture pointer so dragging continues even if pointer leaves viewport
    (ev.currentTarget as HTMLElement)?.setPointerCapture?.(ev.pointerId);
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.dragging) return;

    const dx = ev.clientX - this.dragStartX;
    const dy = ev.clientY - this.dragStartY;

    this.panX = this.panStartX + dx;
    this.panY = this.panStartY + dy;

    this.clampPan();
  }

  onPointerUp(): void {
    this.dragging = false;
  }

  // Optional: wheel zoom (trackpad/mouse)
  onWheel(ev: WheelEvent): void {
    // prevent dialog scroll when cursor is over image
    ev.preventDefault();

    const dir = ev.deltaY > 0 ? -1 : 1;
    this.setZoom(this.zoom + dir * this.zoomStep);
  }

  private clampPan(): void {
    if (this.zoom <= 1) {
      this.panX = 0;
      this.panY = 0;
      return;
    }

    const img = this.imgEl?.nativeElement;
    const vp  = this.imgViewport?.nativeElement;
    if (!img || !vp) return;

    // Image size at zoom=1 (rendered)
    const imgRect = img.getBoundingClientRect();
    const baseW = imgRect.width / this.zoom;
    const baseH = imgRect.height / this.zoom;

    // Viewport size (visible window)
    const vpRect = vp.getBoundingClientRect();
    const vpW = vpRect.width;
    const vpH = vpRect.height;

    // How much bigger the scaled image is than the viewport
    const scaledW = baseW * this.zoom;
    const scaledH = baseH * this.zoom;

    const maxX = Math.max(0, (scaledW - vpW) / 2);
    const maxY = Math.max(0, (scaledH - vpH) / 2);

    this.panX = Math.min(maxX, Math.max(-maxX, this.panX));
    this.panY = Math.min(maxY, Math.max(-maxY, this.panY));
  }

  get imageTransform(): string {
    // translate then scale; origin at center (set in CSS)
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  get isZoomed(): boolean {
    return this.zoom > 1;
  }

  togglePreview(): void {
    const v = this.previewShown();
    this.previewShown.set(!v);
  }

}
