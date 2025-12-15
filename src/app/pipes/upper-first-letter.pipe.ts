import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe that capitalizes the first letter in the input string.
 */
@Pipe({
  name: 'upperFirstLetter'
})
export class UpperFirstLetterPipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) return '';
    
    return value.substring(0, 1).toUpperCase() + value.substring(1);
  }
}
