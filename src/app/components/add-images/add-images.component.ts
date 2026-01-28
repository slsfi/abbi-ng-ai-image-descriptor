import { Component, EventEmitter, Output, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { FileInputComponent } from '../file-input/file-input.component';
import { ImageListService } from '../../services/image-list.service';
import { ImageData } from '../../types/image-data.types';

@Component({
  selector: 'add-images',
  imports: [
    AsyncPipe,
    MatFormFieldModule,
    MatProgressBarModule,
    FileInputComponent
  ],
  templateUrl: './add-images.component.html',
  styleUrl: './add-images.component.scss'
})
export class AddImagesComponent {
  imageListService = inject(ImageListService);

  @Output() addingImages = new EventEmitter<boolean>(false);

  processedCounter: number = 0;
  progressPercentage: number = 0;
  totalFileCount: number = 0;
  private resetTimer?: ReturnType<typeof setTimeout>;

  async addImageFiles(files: File[]): Promise<void> {
    if (!files.length) return;

    // cancel any pending reset
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.addingImages.emit(true);
    this.processedCounter = 0;
    this.totalFileCount = files.length;
    this.progressPercentage = 0;

    const processedFiles: ImageData[] = [];

    // Process the selected files
    for (const file of files) {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        const imgId = this.imageListService.generateId();
        const uploadKey = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${imgId}-${Math.random().toString(16).slice(2)}`;

        reader.onerror = () => reject(reader.error);
        reader.onload = (e: any) => {
          img.onload = () => {
            const resized = this.imageListService.resizeImage(img);
            processedFiles.push({
              id: imgId,
              filename: file.name,
              mimeType: resized.mimeType,
              base64Image: resized.base64,
              height: resized.height,
              width: resized.width,
              descriptions: [],
              activeDescriptionIndex: 0,
              generating: false,
              filesApiId: undefined,
              filesApiUri: undefined,
              filesApiProvider: undefined,
              uploadKey: uploadKey,
            });

            this.processedCounter++;
            this.progressPercentage = Math.min(
              100,
              Math.round((this.processedCounter / this.totalFileCount) * 100)
            );

            resolve();
          };
          img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
          img.src = e.target.result;
        };

        reader.readAsDataURL(file);
      });
    }

    // Add the added, processed images to the images array in ImageListService
    const imageList = this.imageListService.imageList;
    imageList.push(...processedFiles);
    this.imageListService.updateImageList(imageList);

    this.addingImages.emit(false);

    // Reset the progress bar with a slight delay
    this.resetTimer = setTimeout(() => {
      this.totalFileCount = 0;
      this.processedCounter = 0;
      this.progressPercentage = 0;
    }, 1000);     

  }

}
