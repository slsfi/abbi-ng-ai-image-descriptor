import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'file-input',
  standalone: true,
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
    this.uniqueId = 'file-input-' + crypto.randomUUID();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
      this.filesSelected.emit(this.selectedFiles);
    }
  }
}
