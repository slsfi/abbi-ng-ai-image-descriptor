import { Component, EventEmitter, Output } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { FileInputComponent } from '../file-input/file-input.component';
import { ImageListService } from '../../services/image-list.service';
import { ImageData } from '../../types/image-data.types';

@Component({
  selector: 'add-images',
  standalone: true,
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
  @Output() addingImages = new EventEmitter<boolean>(false);

  idCounter: number = 0;
  processedCounter: number = 0;
  progressPercentage: number = 0;
  totalFileCount: number = 0;

  constructor(public imageListService: ImageListService) {}

  addImageFiles(files: File[]): void {
    if (files.length) {
      this.addingImages.emit(true);
      this.processedCounter = 0;
      this.totalFileCount = files.length;
      this.progressPercentage = 0;
      const processedFiles: ImageData[] = [];

      // Process the selected files
      const promises = Array.from(files).map((file, index) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          const reader = new FileReader();

          reader.onload = (e: any) => {
            img.src = e.target.result;
            img.onload = () => {
              const resizedImgDetails = this.imageListService.resizeImage(img);
              processedFiles[index] = {
                id: this.idCounter++,
                filename: file.name,
                base64Image: resizedImgDetails.base64,
                height: resizedImgDetails.height,
                width: resizedImgDetails.width,
                descriptions: [],
                activeDescriptionIndex: 0,
                generating: false
              };
              
              // Update progress bar
              this.processedCounter++;
              this.progressPercentage = (this.processedCounter / this.totalFileCount) * 100.0;

              resolve();
            };
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(promises).then(() => {
        // Add the added, processed images to the images array in ImageListService
        const imageList = this.imageListService.imageList;
        imageList.push(...processedFiles);
        this.imageListService.updateImageList(imageList);

        this.addingImages.emit(false);

        // Reset the progress bar with a slight delay
        setTimeout(() => {
          this.totalFileCount = 0;
          this.processedCounter = 0;
          this.progressPercentage = 0;
        }, 1000);
      });
    }
  }

}
