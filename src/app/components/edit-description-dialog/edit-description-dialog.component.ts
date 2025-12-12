import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogContent } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ImageData } from '../../types/image-data.types';

@Component({
    selector: 'edit-description-dialog',
    imports: [
        FormsModule,
        MatButtonModule,
        MatDialogClose,
        MatDialogContent,
        MatFormFieldModule,
        MatInputModule
    ],
    templateUrl: './edit-description-dialog.component.html',
    styleUrl: './edit-description-dialog.component.scss'
})
export class EditDescriptionDialogComponent implements OnInit {
  imageObj = inject<ImageData>(MAT_DIALOG_DATA);

  aspectRatio: number = 1.333;
  editedDescription?: string;

  ngOnInit(): void {
    this.editedDescription = this.imageObj.descriptions[this.imageObj.activeDescriptionIndex].description;
    this.aspectRatio = this.imageObj.width / this.imageObj.height;
  }

}
