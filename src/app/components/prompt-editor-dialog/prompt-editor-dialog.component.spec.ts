import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { PromptEditorDialogComponent } from './prompt-editor-dialog.component';

describe('PromptEditorDialogComponent', () => {
  let fixture: ComponentFixture<PromptEditorDialogComponent>;
  let close: ReturnType<typeof vi.fn>;

  function button(label: string): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(button => button.textContent?.trim().endsWith(label))!;
  }

  async function edit(value: string): Promise<void> {
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('textarea');
    textarea.value = value;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    close = vi.fn();
    await TestBed.configureTestingModule({
      imports: [PromptEditorDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: {
          taskType: 'transcriptionBatchTei', variantId: 'default', taskLabel: 'TEI transcription'
        } },
        { provide: MatDialogRef, useValue: { close } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(PromptEditorDialogComponent);
    await fixture.whenStable();
  });

  it('updates save availability through ngModel and returns the edited prompt', async () => {
    await edit('   ');
    expect(button('Save').disabled).toBe(true);

    await edit('Custom transcription instructions');
    expect(button('Save').disabled).toBe(false);
    expect(button('Restore original').disabled).toBe(false);
    button('Save').click();
    expect(close).toHaveBeenCalledWith('Custom transcription instructions');
  });

  it('restores the original prompt in the textarea and disables the restore action', async () => {
    await edit('Custom instructions');
    button('Restore original').click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('textarea').value)
      .toBe(fixture.componentInstance.originalPrompt.replace(/\r\n?/g, '\n'));
    expect(button('Restore original').disabled).toBe(true);
  });

  it('cancels without returning an edited prompt', async () => {
    await edit('Unsaved instructions');
    button('Cancel').click();
    expect(close).toHaveBeenCalledWith(null);
  });
});
