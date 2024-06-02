import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogTitle,
  MatDialogContent,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ImageData } from '../../types/image-data.types';

@Component({
  selector: 'edit-description-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogTitle,
    MatDialogContent,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './edit-description-dialog.component.html',
  styleUrl: './edit-description-dialog.component.scss'
})
export class EditDescriptionDialogComponent implements OnInit {
  editedDescription?: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public imageObj: ImageData
  ) {}

  ngOnInit(): void {
    this.editedDescription = this.imageObj.descriptions[this.imageObj.activeDescriptionIndex].description;
  }

}
