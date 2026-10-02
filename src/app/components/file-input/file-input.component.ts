import { Component, EventEmitter, OnInit, Output, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'file-input',
  imports: [MatButtonModule],
  templateUrl: './file-input.component.html',
  styleUrl: './file-input.component.scss'
})
export class FileInputComponent implements OnInit {
  readonly acceptedFileTypes = input<string>('');
  readonly appearence = input<string>('flat'); // 'flat' or 'stroked'
  readonly label = input<string>('Upload Files');
  readonly multiple = input<boolean>(false);
  @Output() filesSelected: EventEmitter<File[]> = new EventEmitter<File[]>();

  selectedFiles: File[] = [];
  uniqueId: string = '';

  ngOnInit(): void {
    const randomKey = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.uniqueId = `file-input-${randomKey}`;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
      this.filesSelected.emit(this.selectedFiles);
      input.value = ''; // Reset the input value to allow selecting the same file again
    }
  }
}
