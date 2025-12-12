import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

import { IsEmptyStringPipe } from '../../pipes/is-empty-string.pipe';
import { ExportService, EXPORT_FORMAT_OPTIONS } from '../../services/export.service';
import { SettingsService } from '../../services/settings.service';
import { ExportFormatOption } from '../../types/export.types';

@Component({
  selector: 'export-dialog',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    IsEmptyStringPipe
  ],
  templateUrl: './export-dialog.component.html',
  styleUrl: './export-dialog.component.scss',
})
export class ExportDialogComponent {
  private readonly exportService = inject(ExportService);
  readonly settings = inject(SettingsService);

  readonly formatOptions: ExportFormatOption[] = EXPORT_FORMAT_OPTIONS;

  selectedFormatOption: ExportFormatOption = this.exportService.getPreviousFileFormat()
    ? this.formatOptions.find(
        (f) => f.fileFormat === this.exportService.getPreviousFileFormat()
      ) ?? this.formatOptions[0]
    : this.formatOptions[0];
  filename: string = this.exportService.getPreviousFilename();

}
