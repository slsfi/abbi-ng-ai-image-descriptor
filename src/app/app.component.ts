import {
  Component, OnDestroy, OnInit, computed, effect, inject,
  signal, untracked
} from '@angular/core';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { FormControlStatus, FormGroup } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconRegistry } from '@angular/material/icon';
import { MatStepperModule, StepperOrientation } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map, Observable, Subscription } from 'rxjs';

import { APP_VERSION } from '../assets/config/app-version';
import { AddImagesComponent } from './components/add-images/add-images.component';
import { ApiKeyFormComponent } from './components/api-key-form/api-key-form.component';
import { GenerateDescriptionsComponent } from './components/generate-descriptions/generate-descriptions.component';
import { HeaderComponent } from './components/header/header.component';
import { SettingsFormComponent } from './components/settings-form/settings-form.component';
import { UpperFirstLetterPipe } from './pipes/upper-first-letter.pipe';
import { CostService } from './services/cost.service';
import { ImageListService } from './services/image-list.service';
import { PromptService } from './services/prompt.service';
import { SettingsService } from './services/settings.service';
import { ApiKeysService } from './services/api-keys.service';
import { ModelProvider } from '../assets/config/models';

@Component({
  selector: 'app-root',
  imports: [
    AsyncPipe,
    DecimalPipe,
    MatButtonModule,
    MatStepperModule,
    MatTooltipModule,
    AddImagesComponent,
    ApiKeyFormComponent,
    GenerateDescriptionsComponent,
    HeaderComponent,
    SettingsFormComponent,
    UpperFirstLetterPipe
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  private breakpointObserver = inject(BreakpointObserver);
  private matIconReg = inject(MatIconRegistry);
  private apiKeys = inject(ApiKeysService);
  private apiKeyStatusSubscr?: Subscription;
  private apiKeyFormStatus = signal<FormControlStatus>('INVALID');
  readonly costService = inject(CostService);
  imageListService = inject(ImageListService);
  prompts = inject(PromptService);
  settings = inject(SettingsService);

  addingImages = signal<boolean>(false);
  apiKeyFormGroup = signal<FormGroup | undefined>(undefined);
  readonly isApiKeyFormValid = computed(() => this.apiKeyFormStatus() === 'VALID');
  appVersion = APP_VERSION;

  // Observe viewport width so the stepper orientation can be changed
  // from horizontal to vertical when the viewport width is less than
  // 800px.
  stepperOrientation: Observable<StepperOrientation> = this.breakpointObserver
    .observe('(min-width: 800px)')
    .pipe(map(({matches}) => (matches ? 'horizontal' : 'vertical')));
  
  constructor() {
    effect(() => {
      const provider = this.settings.selectedModel().provider;
      const formGroup = this.apiKeyFormGroup();
      // Restore the provider key when the form becomes available as well.
      if (formGroup) {
        untracked(() => this.onProviderChanged(provider));
      }
    });
  }

  ngOnInit() {
    // Set Angular Material to use the new Material Symbols icon font.
    this.matIconReg.setDefaultFontSetClass('material-symbols-outlined');
  }

  ngOnDestroy(): void {
    this.apiKeyStatusSubscr?.unsubscribe();
  }

  onProviderChanged(provider: ModelProvider) {
    const formGroup = this.apiKeyFormGroup();
    const keyCtrl = formGroup?.get('apiKeyFC');
    if (!keyCtrl) return;

    const storedKey = this.apiKeys.getKey(provider);

    if (storedKey) {
      // Restore & immediately validate
      keyCtrl.setValue(storedKey);
      keyCtrl.markAsTouched();
      keyCtrl.updateValueAndValidity(); // triggers async validator
    } else {
      // Clear
      keyCtrl.reset('');
      keyCtrl.markAsPristine();
      keyCtrl.markAsUntouched();
      formGroup?.updateValueAndValidity({ emitEvent: true });
    }
  }

  onApiKeyValidated(apiKey: string) {
    const provider = this.settings.selectedModel().provider as ModelProvider;
    this.apiKeys.setKey(provider, apiKey);
    this.apiKeys.markValidated(provider);
  }

  setApiKeyFormGroup(formGroup: FormGroup): void {
    if (this.apiKeyFormGroup() === formGroup) return;
    this.apiKeyStatusSubscr?.unsubscribe();
    this.apiKeyFormGroup.set(formGroup);
    this.apiKeyFormStatus.set(formGroup.status);
    this.apiKeyStatusSubscr = formGroup.statusChanges.subscribe(status => {
      this.apiKeyFormStatus.set(status);
    });
  }

  setAddingImages(status: boolean): void {
    this.addingImages.set(status);
  }

}
