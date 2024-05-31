import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { catchError, debounceTime, Observable, of, Subscription, switchMap } from 'rxjs';

import { FileInputComponent } from '../file-input/file-input.component';
import { OpenAiService } from '../../services/openai.service';

@Component({
  selector: 'api-key-form',
  standalone: true,
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
  @Input() modelProvider: string = ''
  @Output() formGroupOutput = new EventEmitter<FormGroup>();

  apiKeyFormGroup: FormGroup;
  apiKeyValidationMessage: string | null = null;
  formControlChangeSubscr: Subscription | null | undefined = null;
  formGroupChangeSubscr: Subscription | null = null;
  hideApiKey: boolean = true;

  constructor(
    private fb: FormBuilder,
    private openaiService: OpenAiService
  ) {
    this.apiKeyFormGroup = this.fb.group({
      apiKeyFC: new FormControl('', {
        validators: [Validators.required],
        asyncValidators: [this.apiKeyValidator.bind(this)],
        updateOn: 'blur' // Run async validator when the control loses focus
      })
    });
  }

  get apiKeyFC() {
    return this.apiKeyFormGroup.get('apiKeyFC');
  }

  ngOnInit(): void {
    // Emit the form group when the component initializes
    this.formGroupOutput.emit(this.apiKeyFormGroup);

    // Subscribe to the form group value changes and emit the form group whenever changes occur
    this.formGroupChangeSubscr = this.apiKeyFormGroup.valueChanges.subscribe(() => {
      this.formGroupOutput.emit(this.apiKeyFormGroup);
    });

    // Update the API key and OpenAI client in the OpenaiService
    // when the value of the API key form field changes and the
    // entered key is valid.
    this.formControlChangeSubscr = this.apiKeyFC?.statusChanges.subscribe(status => {
      if (this.apiKeyFC?.value) {
        if (status === 'PENDING') {
          this.apiKeyValidationMessage = 'Validating API key ...';
        } else if (status === 'VALID') {
          this.apiKeyValidationMessage = 'The API key is valid.';
          this.openaiService.updateClient(this.apiKeyFC.value as string);
        } else {
          this.apiKeyValidationMessage = null;
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.formControlChangeSubscr?.unsubscribe();
    this.formGroupChangeSubscr?.unsubscribe();
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
    return this.openaiService.isValidApiKey(control.value).pipe(
      debounceTime(500),
      switchMap(isValid => {
        return isValid ? of(null) : of({ invalidApiKey: true });
      }),
      catchError(() => of({ invalidApiKey: true }))
    );
  }

}
