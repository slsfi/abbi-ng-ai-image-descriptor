# Development notes

See the [README](../README.md) for local setup, dependency updates, and deployment. This document records architectural choices and guidance for changing the app.

## State and rendering

The app uses Angular's default zoneless change detection and implicit `OnPush` components. UI state flows through both signals and observables; [Angular's zoneless guide](https://angular.dev/guide/zoneless) describes the notifications that schedule rendering.

Use signals for template state updated by asynchronous callbacks, such as file-loading progress and generation controls. Preserve existing observables and `AsyncPipe` bindings: their emissions already notify Angular, so converting them to signals is unnecessary.

Image results remain plain objects in [ImageListService](../src/app/services/image-list.service.ts). After changing a row's generation flag, descriptions, or active description, call `publishImageList()`. It emits a shallow array copy while preserving image and description references, which ongoing generation requests retain across awaits. Add/remove operations already publish the list.

API-key validation uses reactive forms and observable validators. Signal snapshots of form value/status/errors drive the validation UI and root stepper/defer state. Preserve these notifications when changing validation; asynchronous form updates alone do not schedule rendering.

## Regression tests

Run the suite and verify production compilation after behavior changes:

```sh
npm test -- --watch=false
npm run build
```

Async DOM regressions should assert rendered behavior after `await fixture.whenStable()`. Resolve mocked SDK promises or invoke mocked native callbacks first: `whenStable()` waits for Angular's scheduled work, not every arbitrary asynchronous operation. Avoid forcing `fixture.detectChanges()` after the update, which can hide a missing rendering notification.

Mock AI-provider responses so tests remain repeatable and need no credentials. Cover intermediate progress as well as completion, failure, and cancellation when relevant to the changed workflow.

## Diagnosing missed updates

When investigating stale UI, temporarily import `provideCheckNoChangesConfig` from `@angular/core` and add `provideCheckNoChangesConfig({ exhaustive: true, interval: 1000 })` to `appConfig.providers` in [app.config.ts](../src/app/app.config.ts). During development, it checks for bindings changed without a rendering notification. Remove the provider and import when the investigation is complete. See the [Angular diagnostic API](https://angular.dev/api/core/provideCheckNoChangesConfig).

The completed [zoneless migration plan](zoneless-migration-plan.md) records the migration history and its regression checklist.
