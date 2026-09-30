import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'file-input',
  imports: [MatButtonModule],
  templateUrl: './file-input.component.html',
  styleUrl: './file-input.component.scss'
})
export class FileInputComponent implements OnInit {
  @Input() acceptedFileTypes: string = '';
  @Input() appearence: string = 'flat'; // 'flat' or 'stroked'
  @Input() label: string = 'Upload Files';
  @Input() multiple: boolean = false;
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
