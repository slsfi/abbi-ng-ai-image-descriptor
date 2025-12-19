import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'characterCount',
  standalone: true
})
export class CharacterCountPipe implements PipeTransform {
  transform(value: string): number {
    if (!value) {
      return 0;
    }
    return [...value].length;
  }
}
