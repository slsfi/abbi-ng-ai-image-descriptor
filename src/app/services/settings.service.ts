import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { models } from '../../assets/config/models';
import { prompts } from '../../assets/config/prompts';
import { Model, Models } from '../types/model.types';
import { Prompt, PromptOption } from '../types/prompt.types';
import { RequestSettings } from '../types/settings.types';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private _availableModels = new BehaviorSubject<Models>(models);
  private _includeFilename = new BehaviorSubject<boolean>(true);
  private _languages = new BehaviorSubject<any[]>(
    prompts.map(p => ({ code: p.languageCode, name: p.languageDisplayName }))
  );
  private _promptTemplates = new BehaviorSubject<PromptOption[]>([]);
  private _selectedDescLength = new BehaviorSubject<number>(200);
  private _selectedLanguage = new BehaviorSubject<string>('sv');
  private _selectedModel = new BehaviorSubject<Model|undefined>(
    models.filter((model) => model.default)[0]
  );
  private _selectedPromptTemplate = new BehaviorSubject<string>('Alt text');
  private _selectedTemperature = new BehaviorSubject<number>(1.0);

  availableModels$ = this._availableModels.asObservable();
  includeFilename$ = this._includeFilename.asObservable();
  languages$ = this._languages.asObservable();
  promptTemplates$ = this._promptTemplates.asObservable();
  selectedDescLength$ = this._selectedDescLength.asObservable();
  selectedLanguage$ = this._selectedLanguage.asObservable();
  selectedModel$ = this._selectedModel.asObservable();
  selectedPromptTemplate$ = this._selectedPromptTemplate.asObservable();
  selectedTemperature$ = this._selectedTemperature.asObservable();

  constructor() {
    // Initialize promptTemplates and selectedPromptTemplate
    this.setPromptTemplate();
  }

  getSettings(): RequestSettings {
    const settings: RequestSettings = {
      model: this.selectedModel,
      temperature: this.selectedTemperature,
      language: this.selectedLanguage,
      descriptionLength: this.selectedDescLength,
      promptTemplate: this.selectedPromptTemplate,
      includeFilename: this.includeFilename
    }
    return settings;
  }

  updateIncludeFilename(value: boolean) {
    this._includeFilename.next(value);
  }

  updatePromptTemplates(templates: any[]) {
    this._promptTemplates.next(templates);
  }

  updateSelectedDescLength(value: number) {
    this._selectedDescLength.next(value);
  }

  updateSelectedLanguage(language: string) {
    this._selectedLanguage.next(language);
    this.setPromptTemplate();  // Update prompt templates whenever the language changes
  }

  updateSelectedModel(value: Model | undefined) {
    this._selectedModel.next(value);
  }

  updateSelectedPromptTemplate(template: string) {
    this._selectedPromptTemplate.next(template);
    this.setModel(); // Update selected model whenever the prompt template changes
  }

  updateSelectedTemperature(value: number) {
    this._selectedTemperature.next(value);
  }

  getSelectedPromptOption(): PromptOption | undefined {
    const selectedPrompt: Prompt | undefined = this.getSelectedPrompt();
    if (selectedPrompt) {
      const selectedPromptOption = selectedPrompt.promptOptions.find(
        (t: PromptOption) => t.type === this.selectedPromptTemplate
      );
      return selectedPromptOption;
    }
    return undefined;
  }

  private getSelectedPrompt(): Prompt | undefined {
    return prompts.find(
      (p: Prompt) => p.languageCode === this.selectedLanguage
    );
  }

  private setPromptTemplate() {
    const selectedPrompt: Prompt | undefined = this.getSelectedPrompt();
    if (selectedPrompt) {
      this.updatePromptTemplates(selectedPrompt.promptOptions);
      const defaultTemplate = selectedPrompt.promptOptions.find(
        (t: PromptOption) => t.type === 'Alt text'
      );
      this.updateSelectedPromptTemplate(
        this.selectedPromptTemplate ? this.selectedPromptTemplate :
          defaultTemplate ? 'Alt text' :
          selectedPrompt.promptOptions[0].type
      );
    }
  }

  private setModel() {
    const currentPromptOption = this.getSelectedPromptOption();
    let setModel: Model | undefined = undefined;
    if (currentPromptOption?.modelRestrictions && currentPromptOption?.modelRestrictions.length > 0) {
      if (currentPromptOption.modelRestrictions?.includes(this.selectedModel?.id || '')) {
        setModel = this.selectedModel;
      } else {
        setModel = models.find(
          (model: Model) => currentPromptOption.modelRestrictions?.includes(model.id)
        );
      }
    } else {
      if (this.selectedModel) {
        setModel = this.selectedModel;
      } else {
        setModel = models.find(
          (model: Model) => model.default === true
        );
      }
    }
    this.updateSelectedModel(setModel ? setModel : models[0])
  }

  get availableModels(): Models {
    return this._availableModels.getValue();
  }

  get includeFilename(): boolean {
    return this._includeFilename.getValue();
  }

  get languages(): any[] {
    return this._languages.getValue();
  }

  get promptTemplates(): any[] {
    return this._promptTemplates.getValue();
  }

  get selectedDescLength(): number {
    return this._selectedDescLength.getValue();
  }

  get selectedLanguage(): string {
    return this._selectedLanguage.getValue();
  }

  get selectedModel(): Model | undefined {
    return this._selectedModel.getValue();
  }

  get selectedPromptTemplate(): string {
    return this._selectedPromptTemplate.getValue();
  }

  get selectedTemperature(): number {
    return this._selectedTemperature.getValue();
  }

}
