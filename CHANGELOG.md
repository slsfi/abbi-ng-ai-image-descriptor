# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [Unreleased]

### Added

- Support for Google GenAI models: [`gemini-3-flash-preview`](https://ai.google.dev/gemini-api/docs/models#gemini-3-flash) and [`gemini-3-pro-preview`](https://ai.google.dev/gemini-api/docs/models#gemini-3-pro).
- Support for the OpenAI [`gpt-5.2`](https://platform.openai.com/docs/models/gpt-5.2) model.
- Option to export generated descriptions as separate plain text (txt) files that are zipped for downloading.
- Option to export generated descriptions in TEI XML format, either with line beginning encoding or not. Replaces the previous XML export option.
- Normalisation of characters in descriptions.
- Ability to zoom image when editing generated description.
- Property `parameters.maxImageShortsidePx` to the model object to allow configuration of the size of images in prompts. The value defaults to `768` if omitted. Setting the value to `null` means that the images are not resized.
- Support for tiered model pricing. `inputPrice` and `outputPrice` of models can be expressed as either flat prices per 1 million tokens (old behaviour), or as ordered tiers. Each tier defines a price per one million tokens up to a given token limit; the final tier (upToTokens: null) applies to all higher token counts. There must be at least one tier – the `upToTokens: null` – tier, and the tiers must be ordered according to the `upToTokens` value. The "null-tier" must be the last tier. Example:

```typescript
  inputPrice: { tiers: [{ upToTokens: 200000, per1M: 2.00 }, { upToTokens: null, per1M: 4.00 }] },
  outputPrice: { tiers: [{ upToTokens: 200000, per1M: 12.00 }, { upToTokens: null, per1M: 18.00 }] },
```

### Changed

- Move export format selection to dialog.
- Migrate to new Angular Material button directives.
- Migrate constructor-based injection to the `inject` function.
- Replace general “image description” term in the UI with term for actual task, i.e. “alt text” or “transcription”.
- Improve settings UX.
- Normalise indentation.
- Improve image handling.
- Improve alt text prompt structure.
- Decouple prompts by task type, move model compatibility to models, and replace BehaviorSubjects with signals.
- Deps: update `@angular/cli`, `@angular/core`, `@angular/cdk` and `@angular/material` to 21.1.0.
- Deps: update `openai` to 6.16.0.
- Deps: update `zone.js` t0 0.16.0.

### Fixed

- Ensure exported text files end with newline.
- Button label.
- Persistent subscription to image list.
- Increase description text area width in edit description dialog.

### Removed

- Deprecated `provideAnimationsAsync()` from `app.config.ts`.
- The `gpt-5.1` model.

### BREAKING CHANGES

- The `reasoning` property of model objects has been replaced with `parameters.reasoningEffort`.
- The shape of AI model and prompt definitions in `src/assets/config/models.ts` and `src/assets/config/prompts.ts` has been updated.



## [1.5.0] – 2025-12-08

### Added

- Support for the OpenAI [`gpt-5.1`](https://platform.openai.com/docs/models/gpt-5.1) model. ([8f306a4](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/8f306a42f2052bd9927c1a24e3e978619398e08d))
- Screenshot of the app to the README. ([1d59167](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/1d591678de57df234ddda47b2d34077dbd4c529a))

### Changed

- Migrate to the OpenAI Responses API. ([28ce6d3](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/28ce6d38a74856704a8e53bb6f67c82085a66903))
- Deps: update `@angular/cli` to 20.3.13, `@angular/core` to 20.3.15, `@angular/cdk` to 20.2.14 and `@angular/material` to 20.2.14. ([f9e8578](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/f9e8578d7d0f96e2943413a68aca340ab4b660dc))
- Deps: update `openai` to 6.10.0. ([a8f8c25](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/a8f8c25abab2690afbccc2b99ea406db280ea21d), [9412dba](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/9412dba1bc0aa2ce7431d3aa6f76fc09d01b664a))
- Deps (dev): update `@types/jasmine` to 5.1.13. ([f44f416](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/f44f4167de9d4bb7d64ea7de2290bd3a939ec2fa))
- Deps (dev): update `jasmine-core` to 5.13.0. ([eec8408](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/eec84084aebd8b961e462c030fa364ed7e5cba56))
- Deps (dev): update `typescript` to 5.9.3. ([5bdc3e7](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/5bdc3e7e6035da5285a50af5a72df3d26dd7b336))
- Deps: update transitive dependencies. ([b61182d](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/b61182dce4c3f48cf5ce7bb94a24615fddd4cc7a))

### Fixed

- Translation prompts. ([568b3bf](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/568b3bf953f3987ae496e94e06060a9556656910))

### Removed

- The `gpt-5` model. ([8f306a4](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/8f306a42f2052bd9927c1a24e3e978619398e08d))



## [1.4.0] – 2025-08-13

### Added

- Support for the OpenAI [`gpt-5`](https://platform.openai.com/docs/models/gpt-5) model. ([590f9dd](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/590f9dd0b74de63efebfe9a0109913e64f75407e))

### Changed

- Update `nginx` to 1.28.0. ([18d1334](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/18d1334ef52a46771deefcbc8b035a0eadc0d36e))
- Deps: update `@angular/cli` to 20.1.5, `@angular/core` to 20.1.6, `@angular/cdk` to 20.1.5 and `@angular/material` to 20.1.5. ([67d1148](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/67d11485f0e81889a4eaa475d20cdee1e22c93cd), [17ca2c8](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/17ca2c869f6bd47b51bc19aadb21c8c2916a56d6))
- Deps: update `docx` to 9.5.1. ([a7368dd](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/a7368dde783dd9850db5c5516a1d6f937cd97a44))
- Deps: update `openai` to 5.12.2. ([e0c8f9f](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/e0c8f9fd7e00a25303201ef9a167e6f64bd1d2b0))
- Deps: update `zone.js` to 0.15.1. ([c58137a](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/c58137ab5e6a05d7b75e1b5a270182dc2c20f36d))
- Deps (dev): update `@types/jasmine` to 5.1.8. ([ce5e9f2](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/ce5e9f25e67cfadad0877ea0e53e885eaed1e0c8))
- Deps (dev): update `jasmine-core` to 5.9.0. ([5598fe2](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/5598fe2c712ae8fb7aba8fb607f4a636ab251cb5))
- Deps: update transitive dependencies. ([e8c2e31](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/e8c2e31856b758752ea36c7c158ce75bba26be34))

### Fixed

- Add the `buffer` package as a direct dependency since it’s required but not included by `docx`. ([7c660b3](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/7c660b341cadfa4cf20203f22c111e3b1e9ee572))
- Set template app version to 0.0.0. ([00d5af9](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/00d5af92af90e031f1a9ae07e0cb24fd27896b47))

### Removed

- The `gpt-4o`, `gpt-4o-mini` and `gpt-4.5-preview` models. ([590f9dd](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/590f9dd0b74de63efebfe9a0109913e64f75407e))



## [1.3.0] – 2025-04-28

### Added

- Support for OpenAI [`gpt-4.1`](https://platform.openai.com/docs/models/gpt-4.1) and [`gpt-4.1-mini`](https://platform.openai.com/docs/models/gpt-4.1-mini) models. `gpt-4.1` set as the new default model. ([b06e6a2](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/b06e6a2f01a0301744131917fdc40399efbec8e6))
- Option to export generated descriptions in plain text format (txt). ([d8d4f2a](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/d8d4f2a05af41b7c0b33d0bd5ed3735d5dc7651f))

### Changed

- Default image description length set to 175 characters. ([cdb4583](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/cdb458325136f207c46b1dbfa67632f19dcf4f19))
- Deps: update `@angular/cli` to 19.2.9, `@angular/core` to 19.2.8, `@angular/cdk` and `@angular/material` to 19.2.11. ([a0d3d91](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/a0d3d9156ff81e5452daa9e7d7af1798ab618986))
- Deps: update `docx` to 9.4.1. ([2b9db52](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/2b9db5296b5335d1a2c74a5f1d4c9d9175bd2564))
- Deps: update `openai` to 4.96.0. ([0ae0e08](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/0ae0e083342dec150131150848c9a1572feab882), [f1a0cea](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/f1a0cead0db9987b948e23ad9689c3550ed7b24e))
- Deps: update `rxjs` to 7.8.2. ([02efa5f](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/02efa5f28e0278e0a453cc08415e4f9ff27289a9))
- Deps (dev): update `jasmine-core` to 5.7.0. ([ea76910](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/ea7691066bf0cdfb770b60ab8771d65f60bae35a))
- Deps (dev): update `typescript` to 5.8.3. ([72a9118](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/72a911831c3b10f435aaa2069d0d05d41f4f1fa8))



## [1.2.0] – 2025-03-26

### Added

- Prompt template for transcribing the text in an image using the `gpt-4.5-preview` model. Option to export generated descriptions in XML format. ([5c38ffb](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/5c38ffbdbab8a0bc3e4a3d724004aee05f43d15b))

### Changed

- Deps: update `@angular` packages to 19.2.x. ([73dbc68](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/73dbc687ef2004a28fe6979a61e0c5cd590ff93e))
- Deps: update `docx` to 9.3.0. ([baf7ff6](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/baf7ff6a69472fc93acb49d4f109cb50c3a1c267))
- Deps: update `openai` to 4.89.0. ([81690a2](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/81690a2a25784d9ebdb73418fe19f46a02409a03))
- Deps (dev): update `@types/jasmine` to 5.1.7. ([91e6ad7](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/91e6ad7c85d5cbe88d19c8270edaa3278aa5ea55))
- Deps (dev): update `typescript` to 5.8.2. ([86b00fd](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/86b00fdc104412d593df3625119d17a8cd9861eb))



## [1.1.4] – 2025-02-18

### Changed

- Remove RouterOutlet from AppComponent imports as it is not used. ([3810b97](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/3810b971f98cb7c41e3ff3a53b8782d9c8dadd7f))
- Update major version of Angular in Dockerfile. ([07ffeec](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/07ffeec3202d0b46b4b94b5b5bf520d3cafd71af))
- Update `nginx` to 1.27.4 and `Node.js` to 22. ([2ca0fec](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/2ca0fec36a704f0a141b213a99ed1dfc49dc8694))
- Update README. ([a050e6c](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/a050e6cab7d59a9b3ef58170723992c931a7340c))
- Deps: update `@angular/cli` to 19.1.7, `@angular/core` to 19.1.6, `@angular/cdk` to 19.1.4 and `@angular/material` to 19.1.4. ([ac05cb3](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/ac05cb3c63c3143795a3109186408533b106b010))
- Deps: update `docx` to 9.2.0. ([491327d](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/491327db682419247c3ef5c2290772108c99e937))
- Deps: update `openai` to 4.85.1. ([7441e27](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/7441e271461cc2313e3c8baf3ca20e137c01a5b0))
- Deps (dev): update `@types/jasmine` to 5.1.6. ([054c76d](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/054c76dee7d4216dba616cc35e56fbac740d1624))
- Deps (dev): update `jasmine-core` to 5.6.0. ([0debf4a](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/0debf4a5ebfd3f1df6e3778debd4b6d0be25fc0f))
- Deps (dev): update `typescript` to 5.7.3. ([d33b70c](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/d33b70ce566b5bfede0360df3ef5727f5cfac21c))
- Deps: update transitive dependencies. ([f3cc22d](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/f3cc22da1b71fed4ba62054753c22a022560b236), [ab78c54](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/ab78c54c5c9636f72c203dd406e378dd69dc0811))

### Fixed

- Style breaks due to Angular major version update. ([27a77ab](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/27a77ab2ef3c83ddaf33898ceba724ea84a93ccf))



## [1.1.3] – 2024-11-22

### Changed

- The app version in the page footer is dynamically updated from `package.json` during the build process. ([93cdd30](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/93cdd30258c0c411f240107d630576716bd211d2))
- Update `nginx` version to 1.26.2 in build workflow config. ([6594c99](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/6594c9938b82636532ebf7f88a7f59dfdae78f39))
- Deps: update `@angular` to 18.2.12. ([3cbaa6f](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/3cbaa6f94619147b6f9f9306a41543da39c7016e))
- Deps: update `openai` to 4.73.0. ([55631c5](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/55631c56ef30ee6a516b07e1c71d0768d3777247))
- Deps: update `tslib` to 2.8.1. ([1ae91c6](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/1ae91c64e48251b80d09c2a6c2194adb68d9f708))
- Dev-deps: update `jasmine-core` to 5.4.0. ([224ef2c](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/224ef2cafa37e71a576c333ea51e702c4a5253aa))
- Deps: update transitive dependencies. ([2b00c26](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/2b00c26b358ba53f503f853fafd2183026838884))



## [1.1.2] – 2024-10-10

### Changed

- Update `gpt-4o` model pricing. ([378b084](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/378b0840783627ad1f604c23644658e5ddd36663))
- Deps: update `@angular` to 18.2.8. ([bd1095f](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/bd1095fa4e537ca1f54cad83da537f4029b61081))
- Deps: update `openai` to 4.67.3. ([7b6b90b](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/7b6b90b13b6e2b953878d54dc35c9e4687a95f60))
- Deps: update transitive dependencies. ([e09beab](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/e09beab159251ebb01e497a45dceb60aa330be4f))
- Dev-deps: update `jasmine-core` to 5.3.0. ([ba90cd5](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/ba90cd5c65f6230dfb997b064e26631f761c5bf6))



## [1.1.1] – 2024-08-30

### Added

- Configuration file for Dependabot version updates of packages. ([ab254df](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/ab254dff55c162b3484ce0ae080fdc20331fbd63), [d5e278d](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/d5e278dca87e15fe1d65be24526dd0ae096cd121))

### Changed

- Update `nginx` to 1.26.2. ([5d82b89](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/5d82b89a0cc16c3c0c9f1df4b1023788d5a011c2))
- Deps: update `@angular` to 18.2.2. ([33cef42](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/33cef42070c686d585cf304b5bbf156953cc709c))
- Deps: update `openai` to 4.57.0. ([8a3d6dc](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/8a3d6dce630e914900d88bb946b01c9d82dbe0aa))
- Deps: update `tslib` to 2.7.0. ([6b2f86b](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/6b2f86b064b15ba7a23b4e30a6e0768e3d23b371))
- Deps (transitive): update `micromatch` to 4.0.8. ([6c9d256](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/6c9d2560e188d9aa67f0dc9a87b6383a536e20fd))



## [1.1.0] – 2024-08-01

### Added

- Support for OpenAI [`gpt-4o-mini`](https://platform.openai.com/docs/models/gpt-4o-mini) model. ([6c4c1f0](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/6c4c1f0478c018808e21abcbf633f222e40b68f4))
- New export format: DOCX file with the data (image filenames and generated descriptions) structured as a table. This new format has been set as the default export format. ([f7af2cb](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/f7af2cb5ac78705cd4acba27e06316de3e27fe4a))
- App version to page footer. ([e2da6c5](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/e2da6c5381207bbf0d859fc09315aa5c8d9ac398))
- Option to translate individual descriptions to other languages. ([89c7866](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/89c7866c52ad9e557d94c1e56d2dbd36a8b1f49d))

### Changed

- Pin Docker image version and set port number. ([3aae4c9](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/3aae4c94f79a6fd48f33684b38d90e0889bc99d0))
- Default approximate length of description reduced to 200 and max value of slider to 300 characters. ([2f4a34f](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/2f4a34f6183142909287131c7e9fd77db402e69f))
- Deps: update `@angular` to 18.1.3. ([83d77ad](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/83d77adfe46bcaa233f34d75dc0369b553737148), [2498300](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/2498300655d458e7ee429adfa9d24d8379dcadc6), [54fc1ad](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/54fc1ad63d0f6c1b2a9fb109aa3010888940f551))
- Deps: update `openai` to 4.53.2. ([6ea52ae](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/6ea52ae4605f24b0391ba009f052dc7add5cba84), [52ac756](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/52ac75643437a070074d7f2b7fab6ff7d759c121))
- Deps: update `tslib` to 2.6.3. ([761aa25](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/761aa252bab2e6e1952ba6ae3c1b99585871d213))
- Deps: update `zone.js` to 0.14.8. ([964ea1d](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/964ea1d61c6f39eec6257e8aa3b014b277d07dc5), [22e4314](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/22e4314321d666d07a61403974dfa34da2316515))
- Deps (dev): update `jasmine-core` to 5.2.0. ([e6308da](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/e6308da4cea5ce490f5b3062876177282a9607ad))
- Deps (dev): update `karma` to 6.4.4. ([16828f8](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/16828f87fd853790e4dbb0d0eacad07359aa3b42))
- Deps (dev): update `typescript` to 5.5.4. ([dcb33ce](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/dcb33cef8961e386851b3029093a01bf49565e1f))
- Deps (transitive): update `braces` to 3.0.3. ([56b3d5e](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/56b3d5e7f1832711ab9c28954867def5f1855e86))
- Deps (transitive): update `ws`, `engine.io` and `socket.io-adapter`. ([cc2c7ed](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/cc2c7edacf89058e30255e19376d4695deb84ab9))

### Removed

- Support for legacy OpenAI `gpt-4-turbo` model. ([569fa30](https://github.com/slsfi/abbi-ng-ai-image-descriptor/commit/569fa3053630052f94269dc25285478ec8b64d85))



## [1.0.0] – 2024-06-03

Initial release.



[unreleased]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.5.0...HEAD
[1.5.0]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.4.0...1.5.0
[1.4.0]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.3.0...1.4.0
[1.3.0]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.2.0...1.3.0
[1.2.0]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.1.4...1.2.0
[1.1.4]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.1.3...1.1.4
[1.1.3]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.1.2...1.1.3
[1.1.2]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.1.1...1.1.2
[1.1.1]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.1.0...1.1.1
[1.1.0]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/releases/tag/1.0.0
