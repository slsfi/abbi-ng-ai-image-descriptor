import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose,
         MatDialogContent, MatDialogTitle
        } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PromptService } from '../../services/prompt.service';
import { TaskTypeId } from '../../../assets/config/prompts';

export interface PromptEditorDialogData {
  taskType: TaskTypeId;
  variantId: string;
  taskLabel: string;
}

@Component({
  selector: 'prompt-editor-dialog',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    TextFieldModule
  ],
  templateUrl: './prompt-editor-dialog.component.html',
  styleUrl: './prompt-editor-dialog.component.scss'
})
export class PromptEditorDialogComponent {
  data = inject<PromptEditorDialogData>(MAT_DIALOG_DATA);
  private readonly promptService = inject(PromptService);

  readonly originalPrompt = this.promptService.getOriginalPrompt(this.data.taskType, this.data.variantId);
  editedPrompt = this.promptService.getPrompt(this.data.taskType, this.data.variantId);

  restoreOriginal(): void {
    this.editedPrompt = this.originalPrompt;
  }

  get isOriginalPrompt(): boolean {
    return this.editedPrompt === this.originalPrompt;
  }

  get isPromptEmpty(): boolean {
    return this.editedPrompt.trim().length === 0;
  }
}
