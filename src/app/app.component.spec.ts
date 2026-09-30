import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';

import { AppComponent } from './app.component';
import { ApiKeyFormComponent } from './components/api-key-form/api-key-form.component';
import { AiService } from './services/ai.service';
import { ApiKeysService } from './services/api-keys.service';
import { SettingsService } from './services/settings.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let settings: SettingsService;
  let apiKeys: ApiKeysService;
  let validations: Subject<boolean>[];
  let ai: { isValidApiKey: ReturnType<typeof vi.fn>; updateClient: ReturnType<typeof vi.fn> };

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[formControlName="apiKeyFC"]');
  }

  function apiKeyForm(): ApiKeyFormComponent {
    return fixture.debugElement.query(By.directive(ApiKeyFormComponent)).componentInstance;
  }

  function stepper(): MatStepper {
    return fixture.debugElement.query(By.directive(MatStepper)).componentInstance;
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

  async function waitForGeneration(): Promise<HTMLElement> {
    // @loading has a 500 ms minimum; let it finish without forcing a render.
    await vi.waitFor(() => {
      expect(fixture.nativeElement.querySelector('generate-descriptions')).not.toBeNull();
    }, { timeout: 2000 });
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('generate-descriptions');
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
      imports: [AppComponent],
      providers: [provideZonelessChangeDetection(), { provide: AiService, useValue: ai }]
    }).compileComponents();

    settings = TestBed.inject(SettingsService);
    apiKeys = TestBed.inject(ApiKeysService);
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => vi.restoreAllMocks());

  it('creates and binds the child form after its initial render without a nested change-detection pass', async () => {
    expect(component.apiKeyFormGroup()).toBeUndefined();
    await fixture.whenStable();

    expect(component).toBeTruthy();
    expect(component.apiKeyFormGroup()).toBe(apiKeyForm().apiKeyFormGroup);
    expect(stepper().steps.get(1)?.stepControl).toBe(component.apiKeyFormGroup());
    expect(component.isApiKeyFormValid()).toBe(false);
    expect(fixture.nativeElement.querySelector('generate-descriptions')).toBeNull();
    expect(ai.isValidApiKey).not.toHaveBeenCalled();
  });

  it.each([false, true])('reflects delayed validation (%s) in the step and defer condition without another interaction', async valid => {
    await fixture.whenStable();
    const navigation: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.stepper-nav');
    navigation[0].querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    expect(stepper().selectedIndex).toBe(1);
    await enterKey('entered-key');
    expect(component.apiKeyFormGroup()?.status).toBe('PENDING');
    expect(component.isApiKeyFormValid()).toBe(false);
    expect(fixture.nativeElement.querySelector('generate-descriptions')).toBeNull();

    navigation[1].querySelectorAll('button')[1].click();
    await fixture.whenStable();
    expect(stepper().selectedIndex).toBe(1);
    navigation[1].querySelector('button')!.click();
    await fixture.whenStable();
    expect(stepper().selectedIndex).toBe(0);

    resolveValidation(valid);
    await fixture.whenStable();
    expect(component.isApiKeyFormValid()).toBe(valid);
    expect(stepper().steps.get(1)?.completed).toBe(valid);
    const apiHeader: HTMLElement = fixture.nativeElement.querySelectorAll('mat-step-header')[1];
    expect(apiHeader.querySelector('.mat-step-icon-state-edit') !== null).toBe(valid);
    if (valid) {
      expect(fixture.nativeElement.querySelector('api-key-form .valid-api-key')).not.toBeNull();
      expect(ai.updateClient).toHaveBeenLastCalledWith('entered-key');
      expect(apiKeys.getKey(settings.selectedModel().provider)).toBe('entered-key');
      expect(apiKeys.isValidated(settings.selectedModel().provider)).toBe(true);
      await waitForGeneration();

      navigation[0].querySelector('button')!.click();
      await fixture.whenStable();
      navigation[1].querySelectorAll('button')[1].click();
      await fixture.whenStable();
      expect(stepper().selectedIndex).toBe(2);
      apiKeyForm().apiKeyFC!.reset('');
      await fixture.whenStable();
      expect(stepper().steps.get(1)?.completed).toBe(false);
      expect(apiHeader.querySelector('.mat-step-icon-state-edit')).toBeNull();
    } else {
      expect(fixture.nativeElement.querySelector('api-key-form mat-error').textContent).toBe('Invalid API key');
      expect(ai.updateClient).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('generate-descriptions')).toBeNull();
    }
  });

  it('keeps an already-loaded generation component when the key is cleared or later invalidated', async () => {
    await fixture.whenStable();
    await enterKey('valid-key');
    resolveValidation(true);
    await fixture.whenStable();
    const generation = await waitForGeneration();

    apiKeyForm().apiKeyFC!.reset('');
    await fixture.whenStable();
    expect(component.isApiKeyFormValid()).toBe(false);
    expect(fixture.nativeElement.querySelector('api-key-form mat-hint')).toBeNull();
    expect(fixture.nativeElement.querySelector('generate-descriptions')).toBe(generation);

    await enterKey('invalid-key');
    resolveValidation(false);
    await fixture.whenStable();
    expect(component.isApiKeyFormValid()).toBe(false);
    expect(fixture.nativeElement.querySelector('generate-descriptions')).toBe(generation);
  });

  it('restores and validates a saved provider key when the initial form becomes available', async () => {
    const provider = settings.selectedModel().provider;
    apiKeys.setKey(provider, 'saved-key');
    await fixture.whenStable();

    expect(input().value).toBe('saved-key');
    expect(apiKeyForm().apiKeyFC?.touched).toBe(true);
    expect(component.apiKeyFormGroup()?.status).toBe('PENDING');
    expect(fixture.nativeElement.querySelector('api-key-form mat-hint').textContent).toContain('Validating API key ...');
    expect(ai.isValidApiKey).toHaveBeenLastCalledWith('saved-key');
    expect(component.isApiKeyFormValid()).toBe(false);

    resolveValidation(true);
    await fixture.whenStable();
    expect(component.isApiKeyFormValid()).toBe(true);
    expect(ai.updateClient).toHaveBeenLastCalledWith('saved-key');
    expect(apiKeys.isValidated(provider)).toBe(true);
    expect(stepper().steps.get(1)?.completed).toBe(false);
    await waitForGeneration();
  });

  it('clears and restores provider keys programmatically and ignores a cancelled validation result', async () => {
    await fixture.whenStable();
    const originalModel = settings.selectedModel();
    const otherModel = settings.availableModels().find(model => model.provider !== originalModel.provider)!;
    await enterKey('original-key');
    resolveValidation(true);
    await fixture.whenStable();

    settings.updateSelectedModel(otherModel);
    await fixture.whenStable();
    expect(input().value).toBe('');
    expect(component.isApiKeyFormValid()).toBe(false);
    expect(apiKeyForm().apiKeyFC?.pristine).toBe(true);
    expect(apiKeyForm().apiKeyFC?.touched).toBe(false);
    expect(fixture.nativeElement.querySelector('api-key-form mat-hint')).toBeNull();
    apiKeys.setKey(otherModel.provider, 'other-saved-key');

    settings.updateSelectedModel(originalModel);
    await fixture.whenStable();
    expect(input().value).toBe('original-key');
    expect(component.apiKeyFormGroup()?.status).toBe('PENDING');
    const cancelled = validations.at(-1)!;

    settings.updateSelectedModel(otherModel);
    await fixture.whenStable();
    expect(input().value).toBe('other-saved-key');
    expect(ai.isValidApiKey).toHaveBeenLastCalledWith('other-saved-key');
    cancelled.next(true);
    cancelled.complete();
    await fixture.whenStable();
    expect(component.isApiKeyFormValid()).toBe(false);
    expect(ai.updateClient).toHaveBeenCalledTimes(1);

    resolveValidation(true);
    await fixture.whenStable();
    expect(component.isApiKeyFormValid()).toBe(true);
    expect(fixture.nativeElement.querySelector('api-key-form .valid-api-key')).not.toBeNull();
    expect(ai.updateClient).toHaveBeenLastCalledWith('other-saved-key');
    expect(apiKeys.getKey(originalModel.provider)).toBe('original-key');
    expect(apiKeys.isValidated(otherModel.provider)).toBe(true);
  });

  it('deduplicates repeated handoffs, seeds replacement status, and unsubscribes on replacement and destruction', async () => {
    await fixture.whenStable();
    const original = component.apiKeyFormGroup()!;
    const subscribeOriginal = vi.spyOn(original.statusChanges, 'subscribe');
    apiKeyForm().formGroupOutput.emit(original);
    apiKeyForm().formGroupOutput.emit(original);
    expect(subscribeOriginal).not.toHaveBeenCalled();

    const replacement = new FormGroup({ apiKeyFC: new FormControl('already-valid', Validators.required) });
    const subscribeReplacement = vi.spyOn(replacement.statusChanges, 'subscribe');
    component.setApiKeyFormGroup(replacement);
    expect(component.isApiKeyFormValid()).toBe(true);
    component.setApiKeyFormGroup(replacement);
    component.setApiKeyFormGroup(replacement);
    expect(subscribeReplacement).toHaveBeenCalledTimes(1);

    original.setErrors({ oldFormError: true });
    expect(component.isApiKeyFormValid()).toBe(true);
    replacement.markAsPending();
    expect(component.isApiKeyFormValid()).toBe(false);
    original.setErrors(null);
    expect(component.isApiKeyFormValid()).toBe(false);

    const subscription = subscribeReplacement.mock.results[0].value;
    fixture.destroy();
    expect(subscription.closed).toBe(true);
    replacement.setErrors(null);
    expect(replacement.valid).toBe(true);
    expect(component.isApiKeyFormValid()).toBe(false);
  });
});
