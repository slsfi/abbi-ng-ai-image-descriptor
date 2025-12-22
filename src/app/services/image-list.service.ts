import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { ImageData } from '../types/image-data.types';
import { SettingsService } from './settings.service';


// the default maximum length of the short side of the image
const IMG_SHORT_SIDE_MAX: number = 768;
// the default maximum length of the long side of the image
const IMG_LONG_SIDE_MAX: number = 2048;

@Injectable({
  providedIn: 'root'
})
export class ImageListService {
  private readonly settings = inject(SettingsService);

  private _imageList: BehaviorSubject<ImageData[]> = new BehaviorSubject<ImageData[]>([]);
  imageList$: Observable<ImageData[]> = this._imageList.asObservable();
  private nextId = 0;

  generateId(): number {
    return this.nextId++;
  }

  resizeImage(img: HTMLImageElement): any {
    const selectedModel = this.settings.selectedModel();
    const shortSideMax: number | null = (selectedModel?.parameters?.maxImageShortsidePx === undefined)
          ? IMG_SHORT_SIDE_MAX
          : selectedModel?.parameters?.maxImageShortsidePx;

    // Resize image to fit into the image dimension requirements of
    // the high-detail setting of OpenAI's vision models.
    const aspectRatio = img.naturalWidth / img.naturalHeight;

    let imgWidth = img.naturalWidth;
    let imgHeight = img.naturalHeight;

    if (shortSideMax) {
      const multiplier = (aspectRatio < 1) ? (1 / aspectRatio) : aspectRatio;
      const longSideMax = (shortSideMax > IMG_LONG_SIDE_MAX)
            ? (shortSideMax * multiplier)
            : IMG_LONG_SIDE_MAX;

      // console.log('short side max', shortSideMax);
      // console.log('long side max ', longSideMax);

      if (imgWidth > imgHeight) {
        // Width is the larger dimension or they are equal
        // First resize to fit into a `longSideMax` px square
        if (imgWidth > longSideMax) {
          imgWidth = longSideMax;
          imgHeight = longSideMax * aspectRatio;
        }
        // Then resize so the short side is within maximum
        if (imgHeight > shortSideMax) {
          imgHeight = shortSideMax;
          imgWidth = shortSideMax * aspectRatio;
        }
      } else {
        // Height is the larger dimension
        // First resize to fit into a `longSideMax` px square
        if (imgHeight > longSideMax) {
          imgHeight = longSideMax;
          imgWidth = longSideMax / aspectRatio;
        }
        // Then resize so the short side is within maximum
        if (imgWidth > shortSideMax) {
          imgWidth = shortSideMax;
          imgHeight = shortSideMax / aspectRatio;
        }
      }
    }

    // console.log('imgWidth', imgWidth);
    // console.log('imgHeight', imgHeight);

    let canvas: HTMLCanvasElement | null = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgWidth;
    canvas.height = imgHeight;
    ctx!.drawImage(img, 0, 0, imgWidth, imgHeight);
    const imgDetails = {
      base64: canvas.toDataURL('image/jpeg'),
      height: imgHeight,
      width: imgWidth
    }
    canvas = null;
    return imgDetails;
  }

  removeImage(imageObj: ImageData): void {
    const images = this.imageList;
    let indexToRemove = -1;
    for (let i = 0; i < images.length; i++) {
      if (imageObj.id == images[i].id) {
        indexToRemove = i;
        break;
      }
    }

    if (indexToRemove > -1 && indexToRemove < images.length) {
      images.splice(indexToRemove, 1);
      this.updateImageList(images);
    }
  }

  deleteActiveDescription(imageObj: ImageData): void {
    if (imageObj.descriptions.length === 0) return;

    const indexToRemove = imageObj.activeDescriptionIndex;

    if (indexToRemove > -1 && indexToRemove < imageObj.descriptions.length) {
      imageObj.descriptions.splice(indexToRemove, 1);
      imageObj.activeDescriptionIndex = (indexToRemove < 1)
            ? 0
            : (
              (indexToRemove > imageObj.descriptions.length - 1)
                    ? indexToRemove - 1
                    : indexToRemove
            );
    }
  }

  updateImageList(list: ImageData[]): void {
    this._imageList.next(list);
  }

  get imageList(): ImageData[] {
    return this._imageList.getValue();
  }
}
