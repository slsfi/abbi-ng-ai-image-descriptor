import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { ImageData } from '../types/image-data.types';

@Injectable({
  providedIn: 'root'
})
export class ImageListService {
  private _imageList: BehaviorSubject<ImageData[]> = new BehaviorSubject<ImageData[]>([]);
  imageList$: Observable<ImageData[]> = this._imageList.asObservable();

  constructor() { }

  resizeImage(img: HTMLImageElement): any {
    // Resize image to fit into the image dimension requirements of
    // the high-detail setting of OpenAI's vision models.
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const shortSideMax = 768; // the maximum length of the short side of the image
    const longSideMax = 2048; // the maximum length of the long side of the image
    let newWidth = img.naturalWidth;
    let newHeight = img.naturalHeight;

    if (newWidth > newHeight) {
      // Width is the larger dimension or they are equal
      // First resize to fit into a 2048 px square
      if (newWidth > longSideMax) {
        newWidth = longSideMax;
        newHeight = longSideMax * aspectRatio;
      }
      // Then resize so the short side is within maximum
      if (newHeight > shortSideMax) {
        newHeight = shortSideMax;
        newWidth = shortSideMax * aspectRatio;
      }
    } else {
      // Height is the larger dimension
      // First resize to fit into a 2048 px square
      if (newHeight > longSideMax) {
        newHeight = longSideMax;
        newWidth = longSideMax / aspectRatio;
      }
      // Then resize so the short side is within maximum
      if (newWidth > shortSideMax) {
        newWidth = shortSideMax;
        newHeight = shortSideMax / aspectRatio;
      }
    }

    let canvas: HTMLCanvasElement | null = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx!.drawImage(img, 0, 0, newWidth, newHeight);
    const imgDetails = {
      base64: canvas.toDataURL('image/jpeg'),
      height: newHeight,
      width: newWidth
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

  updateImageList(list: ImageData[]) {
    this._imageList.next(list);
  }

  get imageList(): ImageData[] {
    return this._imageList.getValue();
  }
}
