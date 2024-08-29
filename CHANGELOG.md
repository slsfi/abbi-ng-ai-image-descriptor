# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [Unreleased]

### Added

- Configuration file for Dependabot version updates of packages.

### Changed

- Update `nginx` to 1.26.2.



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



[unreleased]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.1.0...HEAD
[1.1.0]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/slsfi/abbi-ng-ai-image-descriptor/releases/tag/1.0.0
