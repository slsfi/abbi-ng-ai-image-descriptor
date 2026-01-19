import { ChangeDetectorRef, Component, NgZone, OnInit, effect, inject,
         signal, untracked } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconRegistry } from '@angular/material/icon';
import { MatStepperModule, StepperOrientation } from '@angular/material/stepper';
import { map, Observable } from 'rxjs';

import { APP_VERSION } from '../assets/config/app-version';
import { AddImagesComponent } from './components/add-images/add-images.component';
import { ApiKeyFormComponent } from './components/api-key-form/api-key-form.component';
import { GenerateDescriptionsComponent } from './components/generate-descriptions/generate-descriptions.component';
import { HeaderComponent } from './components/header/header.component';
import { SettingsFormComponent } from './components/settings-form/settings-form.component';
import { ImageListService } from './services/image-list.service';
import { SettingsService } from './services/settings.service';
import { ApiKeysService } from './services/api-keys.service';
import { ModelProvider } from '../assets/config/models';

@Component({
  selector: 'app-root',
  imports: [
    AsyncPipe,
    MatButtonModule,
    MatStepperModule,
    AddImagesComponent,
    ApiKeyFormComponent,
    GenerateDescriptionsComponent,
    HeaderComponent,
    SettingsFormComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private breakpointObserver = inject(BreakpointObserver);
  private cdRef = inject(ChangeDetectorRef);
  private matIconReg = inject(MatIconRegistry);
  private ngZone = inject(NgZone);
  private apiKeys = inject(ApiKeysService);
  imageListService = inject(ImageListService);
  settings = inject(SettingsService);

  addingImages = signal<boolean>(false);
  apiKeyFormGroup!: FormGroup;
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
      // Avoid tracking anything that onProviderChanged reads/writes,
      // so this effect only depends on selectedModel().provider
      untracked(() => this.onProviderChanged(provider));
    });
  }

  ngOnInit() {
    // Set Angular Material to use the new Material Symbols icon font.
    this.matIconReg.setDefaultFontSetClass('material-symbols-outlined');
  }

  onProviderChanged(provider: ModelProvider) {
    const keyCtrl = this.apiKeyFormGroup?.get('apiKeyFC');
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
      this.apiKeyFormGroup?.updateValueAndValidity({ emitEvent: true });
    }
  }

  onApiKeyValidated(apiKey: string) {
    const provider = this.settings.selectedModel().provider as ModelProvider;
    this.apiKeys.setKey(provider, apiKey);
    this.apiKeys.markValidated(provider);
  }

  setApiKeyFormGroup(formGroup: FormGroup): void {
    // Wrap the updating of the form group in ngZone and manually
    // trigger change detection to avoid
    // `ExpressionChangedAfterItHasBeenCheckedError`.
    this.ngZone.run(() => {
      this.apiKeyFormGroup = formGroup;
      this.cdRef.detectChanges();
    });
  }

  setAddingImages(status: boolean): void {
    this.addingImages.set(status);
  }

  get isApiKeyFormValid(): boolean {
    return this.apiKeyFormGroup?.valid ?? false;
  }

}
