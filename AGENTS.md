# Repository Guidelines

## Project Structure & Module Organization

aBBi is a frontend-only Angular application for AI image descriptions and transcription.

- `src/app/components/`: standalone UI components with HTML and SCSS.
- `src/app/services/`: AI providers, image state, settings, and exports; `pipes/`, `types/`, and `utils/` hold shared code.
- `src/assets/config/`: model and prompt configuration; `src/assets/prompts/`: prompt texts.
- `docs/DEVELOPMENT.md`: architecture and regression guidance.
- `Dockerfile`, `compose.yaml`, and `.github/workflows/`: container deployment.

## Build, Test, and Development Commands

Use Node `^24.15.0` and npm `>=11.16.0`.

- `npm ci`: install dependencies from the committed lockfile.
- `npm start`: serve locally at `http://localhost:4200/` with automatic reload.
- `npm run build`: build production output in `dist/`; automatically regenerate `src/assets/config/app-version.ts` from `package.json`.
- `npm run watch`: rebuild continuously with development settings.
- `npm test -- --watch=false`: run the unit suite once.
- `npm run test:watch`: rerun tests as files change.

## Coding Style & Naming Conventions

Follow `.editorconfig`: two-space indentation, UTF-8, final newlines, and single quotes in TypeScript. Use strict TypeScript and Angular template typing. Follow existing kebab-case filenames (`image-list.service.ts`, `file-input.component.ts`), PascalCase classes, camelCase members, and `app-` component selectors. No lint or formatter script is configured.

## State & Rendering

Preserve default zoneless change detection and implicit OnPush components. Use signals for asynchronously updated template state and retain observable/`AsyncPipe` notifications. Call `ImageListService.publishImageList()` after mutating image rows. See `docs/DEVELOPMENT.md` before changing rendering or validation.

## Testing Guidelines

Tests use Vitest, jsdom, and Angular TestBed; colocate `*.spec.ts` with the implementation. Mock AI SDK responses rather than using credentials. Cover progress, completion, failure, and cancellation where relevant. For asynchronous DOM updates, resolve mocked operations, then await `fixture.whenStable()`; avoid post-update `detectChanges()` that hides missing notifications. No numeric coverage threshold is configured. Run tests and a production build after behavior changes.

## Commit & Pull Request Guidelines

Follow the history's Conventional Commit style: `type(scope): description`, with optional scope; for example, `refactor(results): publish image-row state changes`. Common types include `feat`, `fix`, `refactor`, `docs`, `build`, `ci`, and `chore`.

Keep changes focused. PRs should explain the problem, resulting behavior, and validation; link relevant issues and include screenshots for UI changes.

## Security & Dependency Updates

Keep API keys in memory through `ApiKeysService`; never commit credentials. Preserve `package-lock.json` and review version-pinned `allowScripts` approvals when updating dependencies.

