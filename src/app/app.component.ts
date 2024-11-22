import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { FormGroup } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    RouterOutlet,
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
  addingImages: boolean = false;
  apiKeyFormGroup!: FormGroup;
  appVersion = APP_VERSION;
  stepperOrientation: Observable<StepperOrientation>;
  
  constructor(
    private breakpointObserver: BreakpointObserver,
    private cdRef: ChangeDetectorRef,
    public imageListService: ImageListService,
    private matIconReg: MatIconRegistry,
    private ngZone: NgZone,
    public settings: SettingsService
  ) {
    // Observe viewport width so the stepper orientation can be changed
    // from horizontal to vertical when the viewport width is less than
    // 800px.
    this.stepperOrientation = this.breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({matches}) => (matches ? 'horizontal' : 'vertical')));
  }

  ngOnInit() {
    // Set Angular Material to use the new Material Symbols icon font.
    this.matIconReg.setDefaultFontSetClass('material-symbols-outlined');
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
    this.addingImages = status;
  }

  get isApiKeyFormValid(): boolean {
    return this.apiKeyFormGroup?.valid ?? false;
  }

}
