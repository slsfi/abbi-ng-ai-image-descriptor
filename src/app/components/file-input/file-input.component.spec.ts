import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileInputComponent } from './file-input.component';

describe('FileInputComponent', () => {
  let component: FileInputComponent;
  let fixture: ComponentFixture<FileInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileInputComponent],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FileInputComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits the same selected file again and resets the native input each time', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file] });
    const reset = vi.spyOn(input, 'value', 'set');
    const selected = vi.fn();
    component.filesSelected.subscribe(selected);

    input.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();

    expect(selected.mock.calls).toEqual([[[file]], [[file]]]);
    expect(reset).toHaveBeenCalledTimes(2);
    expect(reset).toHaveBeenLastCalledWith('');
  });

  it('renders updated input bindings and keeps the label associated with the input', async () => {
    fixture.componentRef.setInput('label', 'Choose images');
    fixture.componentRef.setInput('acceptedFileTypes', 'image/png');
    fixture.componentRef.setInput('multiple', true);
    await fixture.whenStable();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');
    expect(label.textContent).toBe('Choose images');
    expect(label.htmlFor).toBe(input.id);
    expect(input.name).toBe(input.id);
    expect(input.accept).toBe('image/png');
    expect(input.multiple).toBe(true);
  });
});
