import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, Subject } from 'rxjs';

import { AppComponent } from './app.component';
import { AddImagesComponent } from './components/add-images/add-images.component';
import { ApiKeyFormComponent } from './components/api-key-form/api-key-form.component';
import { AiService } from './services/ai.service';
import { ApiKeysService } from './services/api-keys.service';
import { CostService } from './services/cost.service';
import { ImageListService } from './services/image-list.service';
import { PromptService } from './services/prompt.service';
import { SettingsService } from './services/settings.service';
import { AiResult } from './types/ai.types';
import { ImageData } from './types/image-data.types';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let settings: SettingsService;
  let apiKeys: ApiKeysService;
  let validations: Subject<boolean>[];
  let viewport: BehaviorSubject<BreakpointState>;
  let ai: {
    isValidApiKey: ReturnType<typeof vi.fn>;
    updateClient: ReturnType<typeof vi.fn>;
    describeImage: ReturnType<typeof vi.fn>;
    deleteUploadedFile: ReturnType<typeof vi.fn>;
  };

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input[formControlName="apiKeyFC"]');
  }

  function apiKeyForm(): ApiKeyFormComponent {
    return fixture.debugElement.query(By.directive(ApiKeyFormComponent)).componentInstance;
  }

  function stepper(): MatStepper {
    return fixture.debugElement.query(By.directive(MatStepper)).componentInstance;
  }

  function nextButton(step: number): HTMLButtonElement {
    const navigation: HTMLElement = fixture.nativeElement.querySelectorAll('.stepper-nav')[step];
    return [...navigation.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Next')!;
  }

  async function waitForAddImages(): Promise<AddImagesComponent> {
    await vi.waitFor(() => {
      expect(fixture.nativeElement.querySelector('add-images')).not.toBeNull();
    }, { timeout: 2000 });
    await fixture.whenStable();
    return fixture.debugElement.query(By.directive(AddImagesComponent)).componentInstance;
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
    viewport = new BehaviorSubject<BreakpointState>({
      matches: true, breakpoints: { '(min-width: 800px)': true }
    });
    ai = {
      isValidApiKey: vi.fn(() => {
        const result = new Subject<boolean>();
        validations.push(result);
        return result.asObservable();
      }),
      updateClient: vi.fn(),
      describeImage: vi.fn<AiService['describeImage']>(),
      deleteUploadedFile: vi.fn<AiService['deleteUploadedFile']>().mockResolvedValue(undefined)
    };
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AiService, useValue: ai },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => viewport.asObservable(), isMatched: () => false }
        }
      ]
    }).compileComponents();

    settings = TestBed.inject(SettingsService);
    apiKeys = TestBed.inject(ApiKeysService);
    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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

  it('renders viewport changes through the existing orientation observable and AsyncPipe', async () => {
    await fixture.whenStable();
    expect(stepper().orientation).toBe('horizontal');
    expect(fixture.nativeElement.querySelector('.mat-stepper-horizontal')).not.toBeNull();

    viewport.next({ matches: false, breakpoints: { '(min-width: 800px)': false } });
    await fixture.whenStable();
    expect(stepper().orientation).toBe('vertical');
    expect(fixture.nativeElement.querySelector('.mat-stepper-vertical')).not.toBeNull();

    viewport.next({ matches: true, breakpoints: { '(min-width: 800px)': true } });
    await fixture.whenStable();
    expect(stepper().orientation).toBe('horizontal');
    expect(fixture.nativeElement.querySelector('.mat-stepper-horizontal')).not.toBeNull();
  });

  it('refreshes the root settings, custom-prompt, and session-cost summaries without another interaction', async () => {
    await fixture.whenStable();
    settings.updateSelectedTaskType('transcriptionBatchTei');
    await fixture.whenStable();
    settings.updateSelectedModelId('gpt-5.6-terra');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.run-context-model .run-context-value').textContent)
      .toBe('GPT-5.6 Terra');
    expect(fixture.nativeElement.querySelector('#generate-step-title').textContent)
      .toBe(`Generate ${settings.taskNouns().plural}`);

    settings.updateSelectedReasoningEffort('high');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.run-context-model').textContent).toContain('Reasoning: High');
    expect(fixture.nativeElement.querySelector('.run-context-model').textContent).not.toContain('Temperature:');

    settings.updateSelectedReasoningEffort('none');
    settings.updateSelectedTemperature(0.3);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.run-context-model').textContent).toContain('Temperature: 0.3');

    const prompts = TestBed.inject(PromptService);
    prompts.setCustomPrompt(settings.selectedTaskType(), settings.selectedVariantId(), 'Custom transcription instructions');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.run-context-model').textContent).toContain('Customised prompt');
    prompts.resetCustomPrompt(settings.selectedTaskType(), settings.selectedVariantId());
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.run-context-model').textContent).not.toContain('Customised prompt');

    TestBed.inject(CostService).addCost(0.123);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.run-context-cost .run-context-value').textContent).toBe('$0.123');
  });

  it('gates the image step on observable membership and deferred child loading output', async () => {
    await fixture.whenStable();
    nextButton(0).click();
    await enterKey('valid-key');
    resolveValidation(true);
    await fixture.whenStable();
    nextButton(1).click();
    await fixture.whenStable();
    expect(stepper().selectedIndex).toBe(2);
    const addImages = await waitForAddImages();
    const imageStep = stepper().steps.get(2)!;
    const imageList = TestBed.inject(ImageListService);
    expect(imageStep.completed).toBe(false);

    const image: ImageData = {
      id: imageList.generateId(), filename: 'existing.png', uploadKey: 'existing-upload',
      base64Image: 'data:image/png;base64,aW1hZ2U=', height: 50, width: 100,
      descriptions: [], activeDescriptionIndex: 0, generating: false
    };
    imageList.updateImageList([image]);
    await fixture.whenStable();
    expect(imageStep.completed).toBe(true);

    addImages.addingImages.emit(true);
    await fixture.whenStable();
    expect(component.addingImages()).toBe(true);
    expect(imageStep.completed).toBe(false);
    nextButton(2).click();
    await fixture.whenStable();
    expect(stepper().selectedIndex).toBe(2);

    addImages.addingImages.emit(false);
    await fixture.whenStable();
    expect(component.addingImages()).toBe(false);
    expect(imageStep.completed).toBe(true);
    nextButton(2).click();
    await fixture.whenStable();
    expect(stepper().selectedIndex).toBe(3);

    imageList.updateImageList([]);
    await fixture.whenStable();
    expect(imageStep.completed).toBe(false);
  });

  it('completes settings, validation, native file loading, and delayed generation with the real child components', async () => {
    await fixture.whenStable();
    settings.updateSelectedTaskType('transcription');
    await fixture.whenStable();
    settings.updateSelectedModelId('gpt-4.1');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('settings-form mat-select[name="model"]').textContent).toContain('GPT-4.1');
    expect(fixture.nativeElement.querySelector('#generate-step-title').textContent).toBe('Generate transcriptions');

    nextButton(0).click();
    await enterKey('workflow-key');
    expect(component.apiKeyFormGroup()?.status).toBe('PENDING');
    expect(fixture.nativeElement.querySelector('generate-descriptions')).toBeNull();
    resolveValidation(true);
    await fixture.whenStable();
    await waitForGeneration();
    expect(ai.updateClient).toHaveBeenLastCalledWith('workflow-key');
    nextButton(1).click();
    await fixture.whenStable();
    const addImages = await waitForAddImages();
    expect(stepper().selectedIndex).toBe(2);

    const readers: FileReader[] = [];
    const images: HTMLImageElement[] = [];
    vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function(this: FileReader) {
      readers.push(this);
    });
    vi.stubGlobal('Image', class {
      constructor() {
        const image = document.createElement('img');
        images.push(image);
        return image;
      }
    });
    vi.spyOn(TestBed.inject(ImageListService), 'resizeImage').mockReturnValue({
      base64: 'data:image/jpeg;base64,cmVzaXplZA==', height: 50, width: 100, mimeType: 'image/jpeg'
    });
    const fileInput: HTMLInputElement = fixture.nativeElement.querySelector('add-images input[type="file"]');
    Object.defineProperty(fileInput, 'files', {
      value: [new File(['first image'], 'first.png', { type: 'image/png' }), new File(['second image'], 'second.png', { type: 'image/png' })]
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(component.addingImages()).toBe(true);
    expect(stepper().steps.get(2)?.completed).toBe(false);
    expect(addImages.processedCounter()).toBe(0);

    const completeImage = (index: number) => {
      Object.defineProperty(readers[index], 'result', { value: 'data:image/png;base64,aW1hZ2U=' });
      readers[index].dispatchEvent(new ProgressEvent('load'));
      images[index].dispatchEvent(new Event('load'));
    };
    completeImage(0);
    await fixture.whenStable();
    expect(addImages.processedCounter()).toBe(1);
    expect(fixture.nativeElement.querySelector('add-images mat-progress-bar').getAttribute('aria-valuenow')).toBe('50');
    expect(component.addingImages()).toBe(true);
    expect(TestBed.inject(ImageListService).imageList).toEqual([]);

    completeImage(1);
    await fixture.whenStable();
    expect(component.addingImages()).toBe(false);
    expect(stepper().steps.get(2)?.completed).toBe(true);
    expect(fixture.nativeElement.querySelector('add-images .image-sum').textContent).toContain('total: 2');
    const generation: HTMLElement = fixture.nativeElement.querySelector('generate-descriptions');
    expect(generation.querySelectorAll('tr[mat-row]')).toHaveLength(2);
    nextButton(2).click();
    await fixture.whenStable();
    expect(stepper().selectedIndex).toBe(3);

    let resolveResult!: (result: AiResult) => void;
    ai.describeImage.mockReturnValueOnce(new Promise<AiResult>(resolve => { resolveResult = resolve; }));
    const generateButton: HTMLButtonElement = generation.querySelector('tr[mat-row] td:last-child button')!;
    generateButton.click();
    await fixture.whenStable();
    expect(ai.describeImage).toHaveBeenCalledTimes(1);
    expect(ai.describeImage).toHaveBeenCalledWith(
      expect.objectContaining({ taskType: 'transcription', model: expect.objectContaining({ id: 'gpt-4.1' }) }),
      expect.any(String), 'data:image/jpeg;base64,cmVzaXplZA=='
    );
    expect(generateButton.disabled).toBe(true);
    expect(generation.querySelector('mat-spinner')).not.toBeNull();

    resolveResult({ text: 'Transcribed image text', usage: { inputTokens: 10000, outputTokens: 2500 } });
    await vi.waitFor(() => expect(TestBed.inject(ImageListService).imageList[0].descriptions).toHaveLength(1));
    await fixture.whenStable();
    expect(generation.querySelector('.desc-text')?.textContent?.trim()).toBe('Transcribed image text');
    expect(generation.querySelector('mat-spinner')).toBeNull();
    expect(generateButton.disabled).toBe(false);
    expect(generateButton.textContent?.trim()).toBe('Regenerate');
    expect(fixture.nativeElement.querySelector('.run-context-cost .run-context-value').textContent).toBe('$0.04');
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
