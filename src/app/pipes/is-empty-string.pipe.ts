import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe that returns true if the value is an empty string, null or
 * undefined. Otherwise it returns false.
 */
@Pipe({
  name: 'isEmptyString'
})
export class IsEmptyStringPipe implements PipeTransform {
  transform(value: string | undefined | null): boolean {
    return (value ?? '') === '' ? true : false;
  }
}
