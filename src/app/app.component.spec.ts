import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AppComponent } from './app.component';
import { OpenAiService } from './services/openai.service';

class MockOpenaiService {
  describeImage(settings: any, prompt: string, base64Image: string) {
    return Promise.resolve({}); // Default mock response
  }
}

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let snackBar: MatSnackBar;
  let openaiService: OpenAiService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [
        MatSnackBarModule,
        BrowserAnimationsModule,
        AppComponent
      ],
      providers: [
        { provide: OpenAiService, useClass: MockOpenaiService },
        MatSnackBar,
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    snackBar = TestBed.inject(MatSnackBar);
    openaiService = TestBed.inject(OpenAiService);
    fixture.detectChanges();
  });

  it('should show snackbar with error message on API error', async () => {
    const spy = spyOn(snackBar, 'open');
    spyOn(openaiService, 'describeImage').and.returnValue(Promise.resolve({
      error: {
        status: 400,
        message: 'BadRequestError'
      }
    }));

    const imageObj = {
      generating: false,
      base64Image: 'someBase64ImageString',
      descriptions: [],
      activeDescriptionIndex: -1
    } as any; // Cast to any for simplicity, use appropriate interface/type

    await component.generateImageDescription(imageObj);

    expect(spy).toHaveBeenCalledWith(
      'Error communicating with the OpenAI API: 400 BadRequestError',
      'Dismiss',
      { duration: 5000 }
    );
  });

  /*
    it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'ng-ai-image-descriptor' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('ng-ai-image-descriptor');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, ng-ai-image-descriptor');
  });
  */
});
