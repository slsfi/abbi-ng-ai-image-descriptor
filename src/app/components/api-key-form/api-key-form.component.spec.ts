import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { ApiKeyFormComponent } from './api-key-form.component';
import { AiService } from '../../services/ai.service';

describe('ApiKeyFormComponent', () => {
  let component: ApiKeyFormComponent;
  let fixture: ComponentFixture<ApiKeyFormComponent>;
  let validations: Subject<boolean>[];
  let ai: { isValidApiKey: ReturnType<typeof vi.fn>; updateClient: ReturnType<typeof vi.fn> };
  let groups: ReturnType<typeof vi.fn>;
  let validated: ReturnType<typeof vi.fn>;

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[formControlName="apiKeyFC"]');
  }

  async function enterKey(key: string): Promise<void> {
    input().value = key;
    input().dispatchEvent(new Event('input', { bubbles: true }));
    input().dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  function resolveValidation(valid: boolean): void {
    const result = validations.at(-1)!;
    result.next(valid);
    result.complete();
  }

  beforeEach(async () => {
    validations = [];
    ai = {
      isValidApiKey: vi.fn(() => {
        const result = new Subject<boolean>();
        validations.push(result);
        return result.asObservable();
      }),
      updateClient: vi.fn()
    };
    await TestBed.configureTestingModule({
      imports: [ApiKeyFormComponent],
      providers: [provideZonelessChangeDetection(), { provide: AiService, useValue: ai }]
    }).compileComponents();

    fixture = TestBed.createComponent(ApiKeyFormComponent);
    component = fixture.componentInstance;
    groups = vi.fn();
    validated = vi.fn();
    component.formGroupOutput.subscribe(groups);
    component.apiKeyValidated.subscribe(validated);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates and emits the initial form group after rendering with its current state seeded', async () => {
    expect(component).toBeTruthy();
    expect(groups).not.toHaveBeenCalled();
    await fixture.whenStable();

    expect(groups.mock.calls).toEqual([[component.apiKeyFormGroup]]);
    expect(component.apiKeyFormState()).toEqual({ value: '', status: 'INVALID', errors: { required: true } });
    expect(fixture.nativeElement.querySelector('mat-hint')).toBeNull();
    expect(ai.isValidApiKey).not.toHaveBeenCalled();
  });

  it('keeps blur validation and renders a delayed success with the trimmed client/output key', async () => {
    await fixture.whenStable();
    input().value = '  valid-key  ';
    input().dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(component.apiKeyFC?.value).toBe('');
    expect(ai.isValidApiKey).not.toHaveBeenCalled();

    input().dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(component.apiKeyFC?.status).toBe('PENDING');
    expect(fixture.nativeElement.querySelector('mat-hint').textContent).toContain('Validating API key ...');
    expect(fixture.nativeElement.querySelector('.valid-api-key')).toBeNull();
    expect(ai.updateClient).not.toHaveBeenCalled();

    resolveValidation(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.valid-api-key').textContent).toContain('The API key is valid.');
    expect(fixture.nativeElement.querySelector('mat-hint mat-icon').textContent).toBe('check');
    expect(ai.updateClient.mock.calls).toEqual([['valid-key']]);
    expect(validated.mock.calls).toEqual([['valid-key']]);
    expect(groups.mock.calls).toEqual([[component.apiKeyFormGroup], [component.apiKeyFormGroup]]);
  });

  it.each(['invalid result', 'provider error'])('renders delayed validation failure for %s', async outcome => {
    await fixture.whenStable();
    await enterKey('invalid-key');
    expect(fixture.nativeElement.querySelector('mat-hint').textContent).toContain('Validating API key ...');

    if (outcome === 'provider error') {
      validations.at(-1)!.error(new Error('Provider rejected the request'));
    } else {
      resolveValidation(false);
    }
    await fixture.whenStable();
    expect(component.apiKeyFC?.status).toBe('INVALID');
    expect(fixture.nativeElement.querySelector('mat-error').textContent).toBe('Invalid API key');
    expect(fixture.nativeElement.querySelector('mat-hint')).toBeNull();
    expect(ai.updateClient).not.toHaveBeenCalled();
    expect(validated).not.toHaveBeenCalled();
  });

  it('clears the success hint on reset and refreshes errors even while status stays INVALID', async () => {
    await fixture.whenStable();
    await enterKey('valid-key');
    resolveValidation(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.valid-api-key')).not.toBeNull();

    component.apiKeyFC!.reset('');
    await fixture.whenStable();
    expect(input().value).toBe('');
    expect(fixture.nativeElement.querySelector('mat-hint')).toBeNull();
    expect(component.apiKeyFC?.status).toBe('INVALID');

    component.apiKeyFC!.markAsTouched();
    component.apiKeyFC!.setErrors({ invalidApiKey: true });
    await fixture.whenStable();
    expect(component.apiKeyFC?.status).toBe('INVALID');
    expect(fixture.nativeElement.querySelector('mat-error').textContent).toBe('Invalid API key');

    component.apiKeyFC!.setErrors({ required: true });
    await fixture.whenStable();
    expect(component.apiKeyFC?.status).toBe('INVALID');
    expect(fixture.nativeElement.querySelector('mat-error').textContent).toBe('You must add an API key');
    expect(ai.updateClient).toHaveBeenCalledTimes(1);
  });

  it('renders a trimmed file-loaded key and its async validation without another input event', async () => {
    await fixture.whenStable();
    let reader!: { result: string; onload: (() => void) | null; readAsText: ReturnType<typeof vi.fn> };
    vi.stubGlobal('FileReader', class {
      result = '';
      onload: (() => void) | null = null;
      readAsText = vi.fn();
      constructor() { reader = this; }
    });
    const file = new File(['file-key'], 'api-key.txt', { type: 'text/plain' });
    const fileInput: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(reader.readAsText).toHaveBeenCalledWith(file);
    expect(component.apiKeyFC?.value).toBe('');

    reader.result = ' \n file-loaded-key \n ';
    reader.onload!();
    await fixture.whenStable();
    expect(input().value).toBe('file-loaded-key');
    expect(fixture.nativeElement.querySelector('mat-hint').textContent).toContain('Validating API key ...');
    expect(ai.isValidApiKey).toHaveBeenLastCalledWith('file-loaded-key');

    resolveValidation(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.valid-api-key')).not.toBeNull();
    expect(validated).toHaveBeenLastCalledWith('file-loaded-key');
    expect(groups.mock.calls).toEqual([[component.apiKeyFormGroup], [component.apiKeyFormGroup]]);
  });

  it('stops emitting form and client updates after destruction', async () => {
    await fixture.whenStable();
    await enterKey('pending-key');
    const groupEmissions = groups.mock.calls.length;
    fixture.destroy();

    resolveValidation(true);
    component.apiKeyFormGroup.patchValue({ apiKeyFC: '' });
    expect(groups).toHaveBeenCalledTimes(groupEmissions);
    expect(ai.updateClient).not.toHaveBeenCalled();
    expect(validated).not.toHaveBeenCalled();
  });
});
