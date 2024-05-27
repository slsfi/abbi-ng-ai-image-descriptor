# aBBi – AI-generated image descriptions

aBBi (“AI-bildbeskrivningar”) is a web app for generating image descriptions (e.g. alt texts) using AI. It currently supports OpenAI models with vision capabilities. You need an OpenAI API key to use the tool. It is a frontend app without the need of a backend.

The app is built on [Angular][angular] and uses [Angular Material][material] web components.

<!--
<p>
  <a href="https://github.com/angular/angular"><img alt="Angular version badge" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fslsfi%2Fabbi-ng-ai-image-descriptor%2Fmain%2Fpackage-lock.json&query=%24%5B'packages'%5D%5B'node_modules%2F%40angular%2Fcore'%5D%5B'version'%5D&prefix=v&logo=angular&logoColor=%23fff&label=Angular&color=%23dd0031"></a>
</p>
-->

Author: Sebastian Köhler (2024)

<hr>

## Changelog

[Learn about the latest improvements][changelog].

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Development Setup

### Prerequisites

1. Install [Node.js][node.js] which includes [npm][npm]. The app is compatible with Node `^18.13.0` and `^20.9.0`. Check your Node version with:

```
Node --version
```

2. Install the [Angular CLI][angular_cli] globally:

```
npm install -g @angular/cli
```

3. [Clone][clone_repository] the repository locally and `cd` into the folder. On Windows you can use [GitHub Desktop][github_desktop] or [Git Bash][git_bash] (see [tutorial on Git Bash][git_bash_tutorial]).

4. Install dependencies:

```
npm install
```

### Run local development server

To build and serve the application on a development server, run:

```
npm start
```

Open your browser on http://localhost:4200/. The app will automatically rebuild and reload if you change any of the source files.



[angular]: https://angular.dev/
[angular_cli]: https://angular.dev/cli
[changelog]: CHANGELOG.md
[clone_repository]: https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository
[git_bash]: https://gitforwindows.org/
[git_bash_tutorial]: https://www.atlassian.com/git/tutorials/git-bash
[github_desktop]: https://desktop.github.com/
[material]: https://material.angular.io/
[node.js]: https://nodejs.org/
[npm]: https://www.npmjs.com/get-npm
[SLS]: https://www.sls.fi/en
