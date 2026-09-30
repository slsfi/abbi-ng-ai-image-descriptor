# Angular zoneless and default-OnPush migration plan

Investigated on 2026-09-30 against the Angular 22.2.0 app. The implementation status below records completed phases; the remaining phases are still planned.

The structure and migration rules follow the implemented `digital-edition-cms-vincent/docs/zoneless-migration-plan.md` reference (completed on 2026-09-25), adapted to this app's file loading, AI generation, form handoff, and image-result store.

## Implementation status

**Phases 1–2 implemented and verified on 2026-09-30. Phases 3–7 have not started.**

- Baseline: `npm test -- --watch=false` passed 18 test files / 43 tests; `npm run build` passed.
- Phase 1: the nine compatible Eager children now use implicit default OnPush, and the existing batch-results component's redundant OnPush declaration was removed.
- All ten phase-1 component specs run with explicit zoneless `TestBed` providers. Added 21 behavioral regression tests for file selection, dialog bindings/results, editing/highlighting, zoom/pan/resize, signal-driven settings/batch views, and deferred edit-dialog results. These tests await scheduled rendering without forcing a post-action `detectChanges()`.
- Focused component verification: 13 test files / 31 tests passed. Full suite: 21 test files / 64 tests passed. Production build passed.
- Both baseline and phase-1 builds report the existing initial-bundle budget and CommonJS warnings for Prism and `p-retry`.
- After phase 1, `AppComponent`, `AddImagesComponent`, `ApiKeyFormComponent`, and `GenerateDescriptionsComponent` remained explicitly Eager. Zone.js configuration/dependencies, observable/form APIs, and component state were unchanged.
- Phase 2: `AddImagesComponent` now uses implicit default OnPush. Its processed counter, total file count, and progress percentage are writable signals, including native file/image callbacks and the delayed reset. File processing, `addingImages`, `imageList$`/`AsyncPipe`, and reset cancellation behavior are preserved.
- Added four zoneless file-loading regression tests for incremental progress before list publication, completion through the existing file-input/observable APIs, the delayed reset without another notification, and cancellation of the previous reset during a new selection. Tests control `FileReader`/`Image` callbacks and timers, then await scheduled rendering without `detectChanges()`.
- Phase-2 focused verification: 1 test file / 5 tests passed. Full suite: 21 test files / 68 tests passed. Production build passed with the same initial-bundle budget and CommonJS warnings.
- `AppComponent`, `ApiKeyFormComponent`, and `GenerateDescriptionsComponent` remain explicitly Eager. Zone.js configuration/dependencies and the remaining phases are unchanged.

## Objective and constraints

Remove the app's dependency on Zone.js for change detection with the smallest practical changes. Preserve the current UI, generation workflows, reactive forms, observables, and `AsyncPipe` bindings. Convert component state that currently relies on patched async callbacks into signals.

**Keep `AppComponent` explicitly `Eager` until every app-owned child component is OnPush and verified.** This includes deferred components, nested components, and dialogs. Removing the root's `changeDetection` setting early would also enable OnPush, because it is Angular 22's default. [Angular change detection API](https://angular.dev/api/core/ChangeDetectionStrategy).

Each implementation commit must include its relevant regression tests and pass verification before proceeding to the next commit. No dependency upgrades, SDK rewrites, routing changes, or export redesign are needed.

Use Angular 22's implicit OnPush strategy: remove a component's `changeDetection` declaration and unused `ChangeDetectionStrategy` import in the commit that makes it compatible. Also remove the already-OnPush batch-results component's redundant declaration. Keep Zone.js installed and the production Zone provider enabled through commit 6 so intermediate commits remain runnable.

## Investigation findings

Paths below are relative to the repository root.

| Area | Current implementation | Migration consequence |
| --- | --- | --- |
| Runtime | `src/main.ts` explicitly installs `provideZoneChangeDetection()`. `angular.json` loads `zone.js` for the application and both `zone.js` and `zone.js/testing` in `build.configurations.testing`. `package.json` lists `zone.js` as a dependency. | Remove all three opt-ins in the final commit and update the existing lockfile. |
| Components | There are 14 app components. `BatchResultsComponent` is already OnPush; the other 13, including the root, explicitly use `Eager`. | Migrate children before parents; change the root last. |
| Existing reactive state | `SettingsService`, `PromptService`, `CostService`, and `BatchResultsService` already use signals. `BatchPlanComponent` uses a signal input and computed state. | Preserve these implementations. |
| Observable views | `AppComponent.stepperOrientation` uses `BreakpointObserver` and `AsyncPipe`. Image counts and the generation view use `ImageListService.imageList$` and `AsyncPipe`. | Preserve the observables and their bindings. |
| File loading | `AddImagesComponent.processedCounter`, `totalFileCount`, and `progressPercentage` are plain fields updated by `FileReader`, image-load callbacks, and a reset timer. | Convert these three fields to signals. |
| API-key validation | `ApiKeyFormComponent` assigns a plain `apiKeyValidationMessage` in a `statusChanges` subscription. Its template also reads form validity and errors directly. File loading calls `patchValue()` asynchronously. | Reflect the relevant form state in a template-consumed signal, including error changes that leave the status unchanged. Keep the form and validator observable. |
| Root form integration | The child emits its `FormGroup` during `ngOnInit`. The root stores it inside `NgZone.run()` and immediately calls `detectChanges()` to avoid an initialization error. The root's `isApiKeyFormValid` getter reads mutable `.valid` for `@defer`. | Make the initial handoff safe, use signals for root form reference/status, and explicitly observe async validity changes. |
| Generation controls | `GenerateDescriptionsComponent.generating` and `exporting` are plain booleans. Generation reads the former after awaited requests and throttling delays. | Convert both fields to signals and update every TypeScript and template read. |
| Image rows | `setImageGenerating()`, `commitDescription()`, edit callbacks, and `ImageListService.deleteActiveDescription()` mutate row objects without emitting `imageList$`. Previous/next description also mutates the active index. | Publish these changes through the existing observable so table contents have a reliable notification. |
| Material table | The generation component subscribes to `imageList$` and updates `MatTableDataSource.data`; its template also consumes that stream with `AsyncPipe`. The paginator is conditional but is assigned only once in `ngAfterViewInit`. | Keep the data source and subscription. Publish row changes, and wire the paginator when its query becomes available or changes. |
| Render-dependent work | Prism and textarea resizing already use `afterRenderEffect`/`afterNextRender`. | Preserve these hooks and verify highlighting after the relevant state has rendered. |
| Tests | The Angular unit-test builder uses Vitest. Most component specs only check creation. No app specs use `fakeAsync`, `tick`, or `waitForAsync`. | Add behavioral regression tests; no test-runner migration is required. |

There is no SSR target, so no `PendingTasks` migration is needed. This repository has no lint script; do not copy Vincent's `npm run lint` gate or add lint infrastructure for this migration.

Angular schedules zoneless rendering through template-consumed signal updates and Angular-bound listeners, among other notifications. An ordinary subscription or native callback does not provide that notification by itself. [Zoneless provider API](https://angular.dev/api/core/provideZonelessChangeDetection).

`AsyncPipe` marks its component for checking on emissions, so observable-backed UI can remain as it is. [AsyncPipe API](https://angular.dev/api/common/AsyncPipe). Reactive form model updates need an explicit rendering notification; copying the `FormGroup` reference into a signal alone does not make its internal mutations reactive. [Angular zoneless forms guidance](https://angular.dev/guide/zoneless#reactive-forms-in-zoneless-applications).

## State changes to make, and state to preserve

| State | Planned treatment |
| --- | --- |
| File-loading counters and percentage | Writable signals; use `.set()`/`.update()` in callbacks and call the signals in the template. Keep the existing progress calculation and delay. |
| API-key status, error flags, and validation message | One small signal snapshot containing the relevant value/status/errors; derive the existing message with `computed()`. Refresh it on value and status changes, including empty resets and `INVALID` to `INVALID` error changes. |
| Root `apiKeyFormGroup` and validity | A signal for the group reference, plus a signal for its current status and a derived validity signal. Observe `statusChanges` explicitly and seed the current status. |
| Component-wide `generating` and `exporting` | Writable signals. Preserve the current control flow and export lifetime. |
| `ImageData`/`DescriptionData` fields carried by `imageList$` | Keep plain data objects and the existing stream. Publish previously silent mutations. These fields already belong to the observable-backed image store; wrapping the same store or every row in signals would expand changes into dialogs, providers, and exports. |
| Existing signals and observable bindings | Preserve. Do not replace `imageList$`, `stepperOrientation`, validators, or dialog observables with `toSignal()` or a parallel signal store. |
| Event-driven local fields | Keep `hideApiKey`, dialog `ngModel` fields, zoom/pan fields, and paginator size as plain fields: their changes happen synchronously in Angular template/host listeners, which already notify rendering. Confirm this with OnPush zoneless tests. |
| Initialization-only and internal data | Keep slider limits, displayed columns, file-input IDs, dialog snapshots/options, subscription handles, timers, abort controllers, private maps/sets, and provider upload metadata as ordinary fields. |

This limits signal conversion to state that needs it for notification. Converting event-driven fields to signals, replacing reactive forms with Signal Forms, or changing existing `@Input`/`@Output` APIs throughout the app would add unrelated work.

## Implementation commits

Before implementation, record the results of `npm test -- --watch=false` and `npm run build` against the unchanged baseline. Resolve or document existing failures separately so they are not mistaken for migration regressions. The initial baseline results are recorded in the implementation status above.

### Commit 1 — Migrate compatible child components to OnPush

Suggested commit: `refactor(change-detection): use default OnPush for compatible children`

Remove the explicit `Eager` declarations and unused strategy imports in these components:

- `header`
- `file-input`
- `confirm-action-dialog`
- `prompt-editor-dialog`
- `edit-description-dialog`
- `translate-description-dialog`
- `export-dialog`
- `batch-plan`
- `settings-form`, after its prompt-editor dialog has migrated

Remove `BatchResultsComponent`'s explicit OnPush declaration and strategy import as well; its behavior remains OnPush by default. Its result updates and preview visibility already use signals. Leave `AddImagesComponent`, `ApiKeyFormComponent`, `GenerateDescriptionsComponent`, and `AppComponent` Eager for now.

Add targeted regression tests with `provideZonelessChangeDetection()` in their `TestBed` providers while the application still uses Zone.js:

- File selection emits the selected files and permits selecting the same file again; input labels/IDs still match.
- Prompt editing, restore, empty-input disabling, save, and cancel behave correctly. Saving updates the settings form's customised-prompt indicator through `PromptService`.
- Description editing saves plain text, preview toggling renders and highlights TEI, and pointer/resize/zoom events update the displayed transform and zoom controls.
- Translation language selection and export filename/format bindings update through `ngModel`; close results remain ordinary values.
- Changing model/task settings and batch size updates displayed choices and the batch plan through existing signals.
- Batch result updates, editing, preview, and emitted regeneration/cancellation actions still work in the already-OnPush component.

Reuse existing component specs and add small focused specs for components that currently lack them. Prefer a few workflow tests over tests that simply mirror every field assignment.

### Commit 2 — Use signals for file-loading progress

Suggested commit: `refactor(uploads): signal image-loading progress`

In `add-images.component.ts` and its template, convert `processedCounter`, `totalFileCount`, and `progressPercentage` to signals. Update reads, increments, initial values, and delayed resets. Preserve `addingImages` output, the existing image-list observable, file processing, and timer cancellation behavior. Then remove `AddImagesComponent`'s Eager declaration and strategy import; its `FileInputComponent` child was migrated in commit 1.

Add regression tests that mock `FileReader`/`Image` callbacks and verify:

- Progress renders after each async image load, before the final image-list emission.
- Completion publishes images through `imageList$` and emits `addingImages = false`.
- The delayed reset renders without another user event or observable emission.
- Beginning another selection cancels the previous reset so it cannot clear the new progress.

Run the tests explicitly zoneless so patched browser callbacks cannot hide a missing signal update.

### Commit 3 — Make API-key validation and root form integration reactive

Suggested commit: `refactor(forms): notify API-key validation and defer state`

Keep `FormGroup`, `FormControl`, validators, `updateOn: 'blur'`, and the validator's observable implementation.

In `api-key-form.component.ts` and its template:

1. Introduce the form-state signal snapshot described above. Subscribe before the initial handoff and seed the snapshot from the constructed control. Reflect both value and status changes; read the snapshot for hint text, validity styling, and error branches.
2. Keep successful validation's client update and `apiKeyValidated` output.
3. Move the **initial** `formGroupOutput` emission out of `ngOnInit` and into `afterNextRender`, registered in the constructor's injection context. Keep the existing output contract and subsequent value-change emissions. This avoids changing a parent binding midway through its first render.
4. Remove the component's Eager declaration and strategy import; preserve subscription cleanup.

In `app.component.ts` and its template, while **retaining `Eager`**:

1. Store the received form reference in a signal. Update `[stepControl]` and internal form access accordingly, preserving the initially unavailable form behavior.
2. On a new form reference, subscribe once to the group's `statusChanges`, seed its current status, and write a status signal. Derive `isApiKeyFormValid` from that status and use the signal in `@defer`. Repeated outputs carrying the same group must not create duplicate subscriptions; unsubscribe on replacement/destruction.
3. Make the existing provider-change effect also depend on form readiness, keeping its mutations inside `untracked()`. This ensures restoration runs when the form becomes available, as well as when the provider changes.
4. Remove the `NgZone.run()`/nested `detectChanges()` handoff workaround and their unused injections/imports after the safe handoff is covered by tests.

Add zoneless component and root integration regressions for:

- Initial rendering and form handoff without `ExpressionChangedAfterItHasBeenCheckedError`.
- Delayed validation: `PENDING` to `VALID` and `PENDING` to `INVALID`; hint/error DOM, client updates, step validity, and the root's defer condition update without a subsequent click.
- Switching between required and invalid-key errors while the status remains `INVALID`, and clearing a previously valid key without leaving a stale success hint.
- Loading a key from a file and programmatically resetting/restoring a key during provider changes.
- Restoring an already-stored provider key after initial form availability.
- Repeated group outputs and destruction do not duplicate validation-status subscriptions or updates.

Preserve `@defer`'s existing one-time loading behavior: invalid status prevents the first load, valid status triggers it, and later invalidation does not unload an already-loaded generation component.

Use a controllable validator observable and deferred-component testing/mocks where useful; no real provider credentials or requests are needed.

### Commit 4 — Publish image-row changes through the existing observable

Suggested commit: `refactor(results): publish image-row state changes`

Preserve `ImageListService.imageList$`, its `BehaviorSubject`, the `imageList` getter, plain data types, and `MatTableDataSource`.

Add a small service method to publish the current list after a row mutation, using the existing `updateImageList()` with a shallow array copy. Keep each image object's identity: generation and provider upload workflows hold those references across awaits. Do not introduce a second store.

Publish after these successful mutations:

- `GenerateDescriptionsComponent.setImageGenerating()` — only when the boolean actually changes.
- `commitDescription()` — after appending the description and selecting its index.
- `editDescription()` — after applying a saved edit, including ordinary non-TEI text.
- `previousDescription()` and `nextDescription()` — after changing the active index.
- `ImageListService.deleteActiveDescription()` — after removing the description and correcting the active index.

Add/remove image paths already publish the list; preserve their behavior. Keep Prism's existing highlighting requests, with publication and highlighting ordered so Prism sees the updated rendered text. Cover a two-pass Files API result whose upload cleanup is still pending: the row may still show a spinner when a highlighting request first runs. Consume a request only after its matching code element has rendered and been highlighted, rather than clearing the entire pending set before the node exists; discard requests for removed descriptions.

Add service and generation-view regressions for async row spinner changes, description commits/translation results, saved edits, active-description navigation, and deletion. Assert text, character counts, selected index, and available actions in the rendered table.

At least one test must update a non-TEI row while global generation state stays unchanged and the cost mock emits nothing. This proves the row notification itself works, without relying on a cost signal, highlighting signal, dialog animation, or global flag to cause a coincidental refresh. Verify list membership and image object references are preserved.

Keep `GenerateDescriptionsComponent` Eager in this commit to isolate the store-notification change. Explicitly zoneless tests still verify that publication schedules rendering.

### Commit 5 — Use signals for generation controls and migrate their parent

Suggested commit: `refactor(generation): signal controls and use default OnPush`

Convert `GenerateDescriptionsComponent.generating` and `exporting` to signals. Update the global setter, snackbar callbacks, export assignments, template bindings, and **every** condition in generation/throttling/cancellation paths. A missed `if (this.generating)` would test the signal function's truthiness and break stopping behavior.

Replace the one-time `@ViewChild(MatPaginator)`/`ngAfterViewInit` assignment with a `viewChild(MatPaginator)` signal and a small effect that assigns or clears `matTableDataSource.paginator` as the conditional table appears/disappears. This is a targeted lifecycle fix: generation can initially render with no images or in batch mode, so its paginator may not exist on the first view initialization. Keep the paginator and table APIs. [Angular query guidance](https://angular.dev/guide/components/queries).

Remove `GenerateDescriptionsComponent`'s Eager declaration and strategy import. Its template children (`BatchPlanComponent`, `BatchResultsComponent`) and all dialogs it opens are already OnPush by this point. Preserve `teiEncoding`, `needsHighlight`, render hooks, observable subscriptions, data source, SDK calls, and plain internal operation handles.

Extend generation regressions to cover:

- Delayed single-image and multi-image results: controls and row spinners render at start and finish, including failures.
- Stopping during an awaited request or rate-limit delay prevents later loop iterations; snackbar actions read the signal value correctly.
- Transcription/TEI passes display the correct phase and highlight the resulting markup.
- Batch pending/generating/success/error/cancelled states and regeneration continue to render through `BatchResultsService` signals.
- Cancellation clears the relevant image flags and a late result does not overwrite a cancelled batch.
- Pagination works when images arrive after the initial empty view and after switching away from batch mode; changing modes detaches/reattaches the current paginator correctly.
- Export-button state and emitted export options remain consistent with the current implementation. The current export method returns `void` and clears its flag immediately; changing that lifetime is a separate concern.

**Gate:** all 13 app-owned child components must now be OnPush, including deferred components and dialog entry points. Verify this with a source audit before changing the root.

### Commit 6 — Migrate the root to OnPush

Suggested commit: `refactor(change-detection): use default OnPush for the root`

Only after the preceding gate passes, remove `AppComponent`'s Eager setting and unused strategy import. All 14 app components now use implicit default OnPush. Verify that app component sources contain no `changeDetection:` declarations or `ChangeDetectionStrategy` imports.

Extend root integration coverage to run with OnPush and zoneless `TestBed`: validation unlocks deferred generation, adding-images progress controls step completion, viewport changes update stepper orientation through the existing `AsyncPipe`, and settings/custom-prompt/session-cost changes remain visible.

Verify a complete mocked settings → API-key → images → generation workflow. No change should require an unrelated click to become visible. This commit keeps production's Zone.js configuration in place, allowing the root change to be reviewed independently.

### Commit 7 — Remove Zone.js from application and test builds

Suggested commit: `refactor(change-detection): remove Zone.js`

Angular 22 is already zoneless by default when `provideZoneChangeDetection()` is absent. Simplify `src/main.ts` to bootstrap with the existing `appConfig` directly, removing the Zone provider import and merged-provider wrapper. No replacement provider is required for production. [Angular zoneless provider API](https://angular.dev/api/core/provideZonelessChangeDetection).

Set both `build.options.polyfills` and `build.configurations.testing.polyfills` in `angular.json` to `[]`. Explicit empty arrays prevent accidental inheritance of the old testing polyfills and make the intent clear.

Make the provider, polyfill, and dependency changes atomically. Run `npm uninstall zone.js` to remove the direct dependency and update `package-lock.json`, preserving unrelated versions and script approvals. Confirm no installed package still requires Zone.js. Angular's optional peer declaration may remain as package metadata in the lockfile; that is different from retaining an installed Zone.js package.

The installed Angular 22.2 Vitest builder selects Zone-based test providers when `Zone` is present, while core `TestBed` otherwise defaults to zoneless. These behaviors were checked in the installed builder and core sources. Keep explicit zoneless providers in the focused regression tests; avoid adding a custom test bootstrap unnecessarily.

Run the entire regression suite and production build without Zone.js. Confirm `globalThis.Zone` is absent in a clean browser page, and exercise the flows below.

## Verification required for each commit

- Run affected regression specs during development, then `npm test -- --watch=false` before completing each commit.
- Run `npm run build` to verify production template compilation and deferred imports. Review `git diff` for unintended generated-file/dependency changes.
- For new async DOM regressions, use explicit zoneless `TestBed` configuration during the staged migration, and assert rendered behavior after `await fixture.whenStable()` instead of calling `fixture.detectChanges()` after the async update. Existing initial-render setup calls can remain. [Angular component testing guidance](https://angular.dev/guide/testing/components-scenarios#whenstable).
- Resolve mocked SDK promises or invoke mocked native callbacks explicitly before awaiting rendering. `whenStable()` does not itself wait for every arbitrary SDK promise or file callback in a zoneless app.
- Use Vitest timer helpers for reset/throttling tests and restore timers after each test. Allow Angular's scheduled rendering to run; avoid a fake-timer setup that leaves `whenStable()` waiting indefinitely.
- Inspect each commit's diff and retain `AppComponent`'s Eager setting through commit 5. Use source inspection for the child gate; a component creation test alone does not establish zoneless compatibility.

## Final diagnostic run

Follow the completed Vincent migration's final check as part of commit 7 verification: in a local development run with the cutover changes applied, temporarily add `provideCheckNoChangesConfig({ exhaustive: true, interval: 1000 })` to `appConfig`. Exercise the regression checklist, fix any unnotified app binding updates it identifies, and remove the diagnostic provider and import before finalizing that commit. Confirm the final diff contains no temporary diagnostic configuration. [Angular diagnostic API](https://angular.dev/api/core/provideCheckNoChangesConfig).

Inspect repository configuration and application sources for `zone.js`, `provideZoneChangeDetection`, `NgZone`, `detectChanges`, `ChangeDetectionStrategy`, and `changeDetection:`. The final production code should contain none of the old opt-ins or handoff workaround. Initial `detectChanges()` calls and explicit `provideZonelessChangeDetection()` in regression specs are intentional; optional peer strings in the lockfile are metadata, not an installed package.

## Final regression checklist

| Workflow | Required result without Zone.js |
| --- | --- |
| Model/task settings | Selected model, available parameters, task labels, customised-prompt indicator, and batch plan update immediately. |
| API-key validation | Typed, file-loaded, restored, cleared, valid, and invalid keys show current hints/errors; stepper/defer state follows async status changes. |
| Adding images | Progress updates for each image, completion/count/step state refresh, and the delayed reset appears. |
| Generation | Single/all/translation/TEI/batch results appear; spinners and disabled controls are correct throughout success, error, and stop/cancel paths. |
| Reviewing results | Edit, delete, previous/next selection, character counts, preview, highlighting, and batch editing update without another interaction. |
| Dialog interactions | Prompt restore/save, description editing, zoom/pan/resize, translation options, and export filename/format bindings remain functional. |
| Layout and table | Breakpoint-driven orientation, pagination, adding/removing rows, and row-content changes remain correct. |
| Export | Existing formats still download the currently selected/edited descriptions and batch results. |
| Dependency removal | App and testing polyfills are empty; no app import/provider enables Zone.js; `npm ls zone.js --all` reports no installed dependency; the browser has no `Zone` global. |

The final acceptance condition is seven independently verified commits, all 14 app components using default OnPush, the full regression suite passing, a successful production build, and the diagnostic/browser workflows above functioning without Zone.js. Final zoneless acceptance checks remain pending; completed phase verification is recorded above.
