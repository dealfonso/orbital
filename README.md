![Orbital logo](img/orbital-logo-p.png)

# Orbital (ORB)

ORB is a lightweight mini-framework for building interactive applications with HTML, CSS, and JavaScript, designed to run on the web and grow into an installable PWA. Although it started with games in mind, its design works just as well for standard applications with screen-based navigation and state-driven logic.

The core idea is to build the application as a state machine: you do not navigate by showing screens directly, but by changing the application state. That change activates or deactivates screens and defines the allowed navigation paths.

This approach keeps behavior predictable, makes the project easier to grow, and reduces UI errors as the application scales.

It includes:

- ScreenController to show, stack, and close screens
- StateController to model states and transitions
- BaseScreen to encapsulate the logic of each screen
- I18n to translate the DOM using data-i18n
- ModalDialog for simple modals
- findUIElement to locate elements through hierarchical data-ui selectors
- Base CSS for the app shell, screens, buttons, effects, and modal

## Framework vision

- App-first and cross-platform: designed for web experiences that work well on mobile and desktop
- PWA-ready: a suitable structure for turning the project into an installable app
- Multi-purpose: useful for games as well as business or utility applications
- Explicit architecture: decoupled states, transitions, and screens

## Recommended architecture model

1. Define the application states and their valid transitions
2. Connect each state to the activation of a screen
3. Make each screen self-contained in its own lifecycle
4. Always navigate through state changes, not direct DOM toggles

### Key principles

- State drives the flow; the UI reacts
- Screens should not be shown through direct access from anywhere in the code
- Each screen creates resources when activated and releases them when deactivated
- Navigation is declarative: only allowed transitions are possible

### Screen lifecycle

When a screen is activated:

- attach listeners
- start timers or animations
- allocate the resources needed for that view

When a screen is deactivated:

- detach listeners
- stop timers or animations
- release resources to avoid leaks and ghost behavior

This pattern makes screens robust, isolated, and easy to maintain.

## Branding

Official name: Orbital

Why it fits:

- It is short, memorable, and product-like
- It conveys navigation and movement between screens without sounding technical
- It is broad enough for games and standard apps

Visual identity:

- Orbital logo with an orbit motif and descriptor: State • Flow • Experience

Codename / acronym: ORB

Naming convention:

- CSS prefix: orb-
- JS namespace: ORB
- package name: orbital

## Quick Start (TLDR)

If you just want to get started quickly:

1. Install and load the styles

```bash
npm install orbital
```

```js
import { BaseScreen, ScreenController, StateController, findUIElement } from "orbital";
import "orbital/style.css";
```

2. Create two screens in HTML with data-ui

```html
<main class="orb-app-shell">
  <section data-ui="menu-screen" class="orb-screen">
    <button data-ui="go-about">About</button>
  </section>

  <section data-ui="about-screen" class="orb-screen not-active">
    <button data-ui="go-back">Back</button>
  </section>
</main>
```

3. Connect state + navigation

```js
class AppState extends StateController {
  constructor() {
    super();
    this.setStateTransitions({ menu: ["about"], about: ["menu"] });
  }
}

class MenuScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("menu-screen"), ["go-about"]);
  }
  initEventListeners() {
    this._el.goAbout.addEventListener("click", () => this.controller.state.change("about"));
  }
}

class AboutScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("about-screen"), ["go-back"]);
  }
  initEventListeners() {
    this._el.goBack.addEventListener("click", () => this.controller.state.change("menu"));
  }
}

class App extends ScreenController {
  constructor() {
    super();
    this.state = new AppState();
  }

  init() {
    this.addScreen("menu", new MenuScreen(this));
    this.addScreen("about", new AboutScreen(this));
    this.state.onEnter("menu", () => this.showScreen("menu"));
    this.state.onEnter("about", () => this.showScreen("about"));
    this.state.change("menu");
  }
}

document.addEventListener("DOMContentLoaded", () => new App().init());
```

That is enough to get a minimal working app.

## Practical guide

## Quick API

Quick export reference:

Main exports:

- BaseScreen
- ScreenController
- StateController
- I18n
- ModalDialog
- findUIElement
- ORB (default namespace)

Quick snippet:

```js
import {
  BaseScreen,
  ScreenController,
  StateController,
  I18n,
  ModalDialog,
  findUIElement,
} from "orbital";

import "orbital/style.css";
```

## How to use it

### 1. From npm

```bash
npm install orbital
```

```js
import {
  BaseScreen,
  ScreenController,
  StateController,
  I18n,
  ModalDialog,
  findUIElement,
} from "orbital";

import "orbital/style.css";
```

You can also use the default namespace:

```js
import ORB from "orbital";

const { BaseScreen, ScreenController, StateController, I18n, findUIElement } = ORB;
```

### 2. From CDN (dist)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dealfonso/Orbital@main/dist/style.css">
<script type="module">
  import {
    BaseScreen,
    ScreenController,
    StateController,
    I18n,
    findUIElement,
  } from "https://cdn.jsdelivr.net/gh/dealfonso/Orbital@main/dist/index.js";
</script>
```

You can pin a specific version by replacing @main with a tag or version.

### 3. From src (local development)

If you are working inside the repository:

```js
import {
  BaseScreen,
  ScreenController,
  StateController,
  I18n,
  findUIElement,
} from "./src/index.js";

import "./src/style.css";
```

### 4. dist or src

- dist: ready-to-consume artifacts (ESM bundle + CSS)
- src: source code for debugging or developing the framework

## Minimal application step by step

Goal: two screens, go forward and back, with the smallest amount of code possible.

### 1) Base HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ORB demo</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dealfonso/Orbital@main/dist/style.css">
</head>
<body>
  <main class="orb-app-shell">
    <section data-ui="menu-screen" class="orb-screen orb-effects orb-fade-in">
      <div class="orb-screen-content">
        <h1>Menu</h1>
        <button data-ui="go-about" class="orb-btn">Go to another screen</button>
      </div>
    </section>

    <section data-ui="about-screen" class="orb-screen not-active orb-effects orb-slide-left orb-fade-in">
      <div class="orb-screen-content">
        <h1>About</h1>
        <button data-ui="go-back" class="orb-btn">Back</button>
      </div>
    </section>
  </main>

  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 2) HTML structure

- orb-app-shell: main container that stacks screens
- orb-screen: each screen
- not-active: hidden screen
- orb-screen-content: base inner layout
- orb-screen-stacked-group: variant for content overlays

Each screen should have its own root data-ui, for example menu-screen, game-screen, or settings-screen.

### 3) StateController (state)

```js
class AppState extends StateController {
  constructor() {
    super();
    this.setStateTransitions({
      menu: ["about"],
      about: ["menu"],
    });
  }
}
```

### 4) ScreenController (navigation)

```js
const screens = new ScreenController();
const state = new AppState();

state.onEnter("menu", () => screens.showScreen("menu"));
state.onEnter("about", () => screens.showScreen("about"));
```

### 5) BaseScreen (screen logic)

The uiKeys are resolved inside the screen container using data-ui (and optionally by id if you keep the fallback enabled).

```js
class MenuScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("menu-screen"), ["go-about"]);
  }

  initEventListeners() {
    this._el.goAbout.addEventListener("click", () => this.controller.state.change("about"));
  }
}

class AboutScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("about-screen"), ["go-back"]);
  }

  initEventListeners() {
    this._el.goBack.addEventListener("click", () => this.controller.state.change("menu"));
  }
}
```

### 6) Complete minimal app

```js
import {
  BaseScreen,
  ScreenController,
  StateController,
  findUIElement,
} from "https://cdn.jsdelivr.net/gh/dealfonso/Orbital@main/dist/index.js";

class AppState extends StateController {
  constructor() {
    super();
    this.setStateTransitions({ menu: ["about"], about: ["menu"] });
  }
}

class MenuScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("menu-screen"), ["go-about"]);
  }
  initEventListeners() {
    this._el.goAbout.addEventListener("click", () => this.controller.state.change("about"));
  }
}

class AboutScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("about-screen"), ["go-back"]);
  }
  initEventListeners() {
    this._el.goBack.addEventListener("click", () => this.controller.state.change("menu"));
  }
}

class App extends ScreenController {
  constructor() {
    super();
    this.state = new AppState();
  }

  init() {
    this.addScreen("menu", new MenuScreen(this));
    this.addScreen("about", new AboutScreen(this));
    this.state.onEnter("menu", () => this.showScreen("menu"));
    this.state.onEnter("about", () => this.showScreen("about"));
    this.state.change("menu");
  }
}

document.addEventListener("DOMContentLoaded", () => new App().init());
```

### How to add a new screen

1. Add an orb-screen section with its own data-ui
2. Add internal uiKeys with data-ui
3. Add the new state in StateController
4. Create a class that extends BaseScreen
5. Register the screen with addScreen
6. Connect the state transition with showScreen

Short example:

```js
class SettingsScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("settings-screen"), ["settings-back"]);
  }

  initEventListeners() {
    this._el.settingsBack.addEventListener("click", () => {
      this.controller.state.change("menu");
    });
  }
}
```

## Base styles

The base stylesheet lives in style.css and includes:

- screens.css: shell and screen structure
- buttons.css: buttons and groups
- effects.css: transitions and animations
- modal.css: modal styles

### Main screen classes

- orb-app-shell
- orb-screen
- orb-screen-content
- orb-screen-stacked-group
- not-active

Typical structure:

```html
<main class="orb-app-shell">
  <section data-ui="menu-screen" class="orb-screen not-active">
    <div class="orb-screen-content">...</div>
  </section>
</main>
```

### Buttons

- orb-btn
- orb-btn icon-btn
- xl / xxl
- orb-button-group

```html
<div class="orb-button-group">
  <button class="orb-btn">Normal</button>
  <button class="orb-btn icon-btn xl">+</button>
</div>
```

### Transition effects

Available classes:

- orb-fade-in, orb-fade-out
- orb-slide-up, orb-slide-down, orb-slide-left, orb-slide-right
- orb-scale-up, orb-scale-down, orb-scale-bounce
- orb-shake
- orb-rotate-in-center
- orb-effect-strong, orb-effect-weak
- fast, very-fast, slow, orb-very-slow

Example:

```html
<section class="orb-screen orb-effects orb-slide-left orb-fade-in">...</section>
```

## I18n

I18n translates keys in the DOM through data-i18n and also supports manual translation.

### Basic usage

```js
import { I18n } from "orbital";

const i18n = I18n.getInstance();

i18n.setTranslations({
  es: {
    "app.title": "Mi juego",
    "menu.play": "Jugar",
  },
  en: {
    "app.title": "My game",
    "menu.play": "Play",
  },
});

i18n.setActiveLanguage("es");
```

```html
<h1 data-i18n="app.title">My game</h1>
<button data-i18n="menu.play">Play</button>
```

### Translate a key

```js
I18n.t("menu.play");
```

### Variables

```js
i18n.setTranslations({ es: { "score.value": "Puntos: {value}" } });
I18n.t("score.value", { value: 120 });
```

### Translate a specific scope

```js
const panel = document.querySelector("#panel");
i18n.applyTranslations("es", {}, null, panel);
```

### Extract strings from HTML

```js
const strings = i18n.extractStringsFromHTML();
console.log(strings);
```

## Other: modal

ModalDialog creates modals with button close, backdrop close, Escape support, and actions through data-modal-action.

### Minimal HTML

```html
<div class="orb-modal not-active" data-ui="help-modal" data-backdrop data-escape>
  <div class="orb-modal-content">
    <button class="orb-btn-close" data-close>Close</button>
    <h2>Help</h2>
    <p>This is a simple modal.</p>
    <button class="orb-btn" data-modal-action="accept">Accept</button>
  </div>
</div>
```

### JavaScript

```js
import { ModalDialog, findUIElement } from "orbital";

const modalEl = findUIElement("help-modal");
const modal = new ModalDialog(modalEl, {
  buttonActions: {
    accept() {
      console.log("accept action");
    },
  },
});

document.querySelector("#open-help").addEventListener("click", () => {
  modal.show();
});
```

### Initialize multiple modals

```js
ModalDialog.initModals();
```

### Events

- orb-modal-shown
- orb-modal-hidden
- orb-modal-closed
- orb-modal-action-<name>

```js
modalEl.addEventListener("orb-modal-closed", () => {
  console.log("modal closed");
});
```

## Development

```bash
npm run build
```
