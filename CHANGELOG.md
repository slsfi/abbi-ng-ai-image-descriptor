# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [Unreleased]

### Added

- Prompt template for transcribing the text in an image using the GPT-4.5-preview model. XML export option.



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



[unreleased]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.1.4...HEAD
[1.1.4]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.1.3...1.1.4
[1.1.3]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.1.2...1.1.3
[1.1.2]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.1.1...1.1.2
[1.1.1]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.1.0...1.1.1
[1.1.0]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/releases/tag/1.0.0
