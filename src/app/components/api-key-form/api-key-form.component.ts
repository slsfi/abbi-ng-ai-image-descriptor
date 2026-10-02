import { Component, OnDestroy, OnInit, WritableSignal, afterNextRender, computed, inject, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormControlStatus, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { catchError, debounceTime, Observable, of, Subscription, switchMap } from 'rxjs';

import { FileInputComponent } from '../file-input/file-input.component';
import { AiService } from '../../services/ai.service';
import { SettingsService } from '../../services/settings.service';

type ApiKeyFormState = {
  value: string;
  status: FormControlStatus;
  errors: ValidationErrors | null;
};

@Component({
  selector: 'api-key-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    FileInputComponent
  ],
  templateUrl: './api-key-form.component.html',
  styleUrl: './api-key-form.component.scss'
})
export class ApiKeyFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private aiService = inject(AiService);
  readonly settings = inject(SettingsService);

  readonly apiKeyValidated = output<string>();
  readonly formGroupOutput = output<FormGroup>();

  apiKeyFormGroup: FormGroup;
  readonly apiKeyFormState: WritableSignal<ApiKeyFormState>;
  readonly apiKeyValidationMessage = computed(() => {
    const { value, status } = this.apiKeyFormState();
    if (!value) return null;
    if (status === 'PENDING') return 'Validating API key ...';
    if (status === 'VALID') return 'The API key is valid.';
    return null;
  });
  formControlChangeSubscr: Subscription | null | undefined = null;
  formGroupChangeSubscr: Subscription | null = null;
  hideApiKey: boolean = true;

  constructor() {
    this.apiKeyFormGroup = this.fb.group({
      apiKeyFC: new FormControl('', {
        validators: [Validators.required],
        asyncValidators: [this.apiKeyValidator.bind(this)],
        updateOn: 'blur' // Run async validator when the control loses focus
      })
    });
    this.apiKeyFormState = signal(this.getFormState());
    afterNextRender(() => this.formGroupOutput.emit(this.apiKeyFormGroup));
  }

  get apiKeyFC() {
    return this.apiKeyFormGroup.get('apiKeyFC');
  }

  ngOnInit(): void {
    // Subscribe to the form group value changes and emit the form group whenever changes occur
    this.formGroupChangeSubscr = this.apiKeyFormGroup.valueChanges.subscribe(() => {
      this.apiKeyFormState.set(this.getFormState());
      this.formGroupOutput.emit(this.apiKeyFormGroup);
    });

    // Update the API key and AI client in the AiService
    // when the value of the API key form field changes and the
    // entered key is valid.
    this.formControlChangeSubscr = this.apiKeyFC?.statusChanges.subscribe(status => {
      this.apiKeyFormState.set(this.getFormState());
      if (this.apiKeyFC?.value && status === 'VALID') {
        const key = (this.apiKeyFC.value ?? '').trim();
        this.aiService.updateClient(key);
        this.apiKeyValidated.emit(key);
      }
    });
  }

  ngOnDestroy(): void {
    this.formControlChangeSubscr?.unsubscribe();
    this.formGroupChangeSubscr?.unsubscribe();
  }

  private getFormState(): ApiKeyFormState {
    const control = this.apiKeyFC!;
    return { value: control.value ?? '', status: control.status, errors: control.errors };
  }

  loadApiKeyFromFile(files: File[]): void {
    if (files.length) {
      const file: File = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const newKey = String(reader.result).trim();
        this.apiKeyFormGroup.patchValue({apiKeyFC: newKey});
      };
      reader.readAsText(file);
    }
  }

  private apiKeyValidator(control: AbstractControl): Observable<ValidationErrors | null> {
    if (!control.value) {
      return of(null);
    }
    return this.aiService.isValidApiKey(control.value).pipe(
      debounceTime(500),
      switchMap(isValid => {
        return isValid ? of(null) : of({ invalidApiKey: true });
      }),
      catchError(() => of({ invalidApiKey: true }))
    );
  }

}
