import { Pipe, PipeTransform } from '@angular/core';

import { ImageData } from '../types/image-data.types';

@Pipe({
  name: 'allImagesDescribed',
  pure: false
})
export class AllImagesDescribedPipe implements PipeTransform {
  transform(imageList: ImageData[] | null | undefined): boolean {
    if (imageList === null || imageList === undefined || imageList.length === 0) {
      return false;
    }

    for (let i = 0; i < imageList.length; i++) {
      const imgObj = imageList[i];
      if (imgObj.descriptions.length === 0) {
        return false;
      }
    }

    return true;
  }
}
