![Orbital logo](img/logo-horizontal.svg)

# Orbital

ORB is a lightweight mini-framework for building interactive applications with HTML, CSS, and JavaScript, designed to run on the web and grow into an installable PWA. Although it started with games in mind, its design works just as well for standard applications with screen-based navigation and state-driven logic.

The core idea is to build the application as a state machine: you do not navigate by showing screens directly, but by changing the application state. That change triggers events that enable to activates or deactivates screens depending on the state, and defines the allowed navigation paths.

This approach keeps behavior predictable, makes the project easier to grow, and reduces UI errors as the application scales.

Orbital is a small framework that provides the following features:

- `ScreenController` to manage showing and hiding screens, and dealing with the lifecycle of each screen.
- `StateController` to model states and transitions, taking care of the allowed navigation paths and triggering events when entering or leaving a state.
- `BaseScreen` which is a class that encapsulates the base logic of each screen, ready to be extended by the developer to implement the specific behavior of each screen.
- `I18n` to help translating the DOM using a declarative approach with `data-i18n` attributes in HTML elements (appart from enabling programmatical translations).
- A _base CSS classes_ for the app shell, screens, buttons, effects, and modal, so you can focus on the application logic and not on the boilerplate.

## Framework vision

- **App-first and cross-platform:** designed for web experiences that work well on mobile and desktop.
- **PWA-ready:** a suitable structure for turning the project into an installable app.
- **Multi-purpose:** useful for games as well as business or utility applications.
- **Explicit architecture:** decoupled states, transitions, and screens.

## Recommended architecture model

1. **Define the application states and their valid transitions:** by using `StateController`, you can define the states and their allowed transitions. This creates a clear map of how the application can move from one state to another.
2. **Connect each state to the activation of a screen:** the `StateController` triggers events when entering or leaving a state. You can use these events to show or hide screens through the `ScreenController`.
3. **Each screen self-contained in its own lifecycle:** When a screen is activated, the developer should attach listeners, start timers or animations, and allocate the resources needed for that view. When a screen is deactivated, the developer should detach listeners, stop timers or animations, and release resources to avoid leaks and ghost behavior.
4. **Always navigate through state changes, not direct DOM toggles:** This ensures that the application flow is predictable and that screens are only shown when the state allows it. Directly manipulating the DOM to show or hide screens can lead to inconsistencies and bugs, especially as the application grows in complexity.

# Basic Example

If you just want to learn by example, you can follow the steps below to create a minimal application with two screens and navigation between them.

## HTML

Create two screens in HTML with `data-ui` (which is the identifier for the ui elements in the DOM), and use the `orb-screen` class for each screen. The `not-active` class is used to hide screens that are not currently active (any screen should be hidden by default).

> The `orb-app-shell` class is the main container that contains the screens (using `orb-screen` class), and each screen needs a `orb-screen-content` element which is the base inner layout for each screen.

```html
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/dealfonso/Orbital@main/dist/style.css">
</head>
<body>
  <main class="orb-app-shell">
    <section data-ui="menu-screen" class="orb-screen not-active">
      <div class="orb-screen-content">
        <h1>Menu</h1>
        <button data-ui="go-about">Go to another screen</button>
      </div>
    </section>
    <section data-ui="about-screen" class="orb-screen not-active">
      <div class="orb-screen-content">
        <h1>About</h1>
        <button data-ui="go-back">Back</button>
      </div>
    </section>
  </main>
</body>
<script type="module" src="./app.js"></script>
</html>
```

## JavaScript

Create a JavaScript file (e.g., `app.js`) and import the necessary classes from Orbital. Then, define the application state, screens, and their transitions.

```js
import {
  BaseScreen,
  ScreenController,
  StateController,
  findUIElement,
} from "https://cdn.jsdelivr.net/gh/dealfonso/Orbital@main/dist/index.js";
```

Create a state controller to define the states and their valid transitions. 

```js
class AppState extends StateController {
  constructor() {
    super();
    this.setStateTransitions({ menu: ["about"], about: ["menu"] });
  }
}
```

Create the screens by extending `BaseScreen` and implementing the necessary event listeners to handle navigation.

> The library exports the `findUIElement` function to resolve the `data-ui` elements in the DOM.

The `BaseScreen` constructor automatically discovers the elements in the DOM by their `data-ui` attribute. The class exposes them through `this.ui`, so you can access them later through `this.ui.<uiKey>`. In the example below, the `go-about` and `go-back` buttons are resolved and stored in `this.ui.goAbout` and `this.ui.goBack`, respectively.

These objects are instances of `OrbitalUIObject`, which is a wrapper around the DOM element that provides additional functionality. You can access the underlying DOM element through the `element` property, e.g., `this.ui.goAbout.element`.

```js
class MenuScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("menu-screen"));
  }
  initEventListeners() {
    this.ui.goAbout.addEventListener("click", () => this.controller.state.change("about"));
  }
}

class AboutScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("about-screen"));
  }
  initEventListeners() {
    this.ui.goBack.addEventListener("click", () => this.controller.state.change("menu"));
  }
}
```

Alternatively, you can use the `on(event, callback)` method of the `OrbitalUIObject` to attach event listeners, which is a more convenient way to handle events.

```js
class MenuScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("menu-screen"));
  }
  initEventListeners() {
    this.ui.goAbout.on("click", () => this.controller.state.change("about"));
  }
}
...
```

Finally, create the main application class that extends `ScreenController`, adds the screens, and connects the state transitions to screen visibility.

> Initially the `StateController` will be in a `null` state, so you need to change the state to the initial screen (in this case, `menu`) to show it. As long as the state changes, the corresponding event will be triggered and the screen will be shown.

```js
class App extends ScreenController {
  constructor() {
    super();
    this.state = new AppState();
  }

  init() {
    this.add("menu", new MenuScreen(this));
    this.add("about", new AboutScreen(this));
    this.state.onEnter("menu", () => this.show("menu"));
    this.state.onEnter("about", () => this.show("about"));
    this.state.change("menu");
  }
}

document.addEventListener("DOMContentLoaded", () => new App().init());
```

That is enough to get a minimal working app.

# API 

## `ScreenController` class

The `ScreenController` class is responsible for managing the screens in the application. It allows you to add screens, show or hide them, and handle their lifecycle events.

The `ScreenController` acts as a stack, as in mobile apps you usually navigate through the screens in a stack fashion, so it will keep track of the previous screens and allow you to go back to them if needed. So, it enables the methods

- `push(screenName, payload)`: to push a new screen onto the stack and show it.
- `pop(payload)`: to pop the current screen off the stack and return to the previous one (using a `payload` will override the original `payload` used when the screen was pushed).

> the `payload` argument is optional and can be used to pass data between screens when navigating.

In case that you want to reset the stack and go to a specific screen you can use the following method

- `show(screenName, payload)`: to show a specific screen, hiding the current one and clearing the stack. This is useful for scenarios where you want to reset the navigation flow, such as returning to a main menu or starting a new game.

## `OrbitalUIObject` class
The `OrbitalUIObject` class is a wrapper around a DOM element that provides additional functionality for managing UI elements in the application. It allows you to discover child elements with `data-ui` attributes, attach event listeners, and manage the element's lifecycle.

When creating a new `OrbitalUIObject`, you should pass the DOM element that represents the UI object. The constructor will automatically discover any child elements with `data-ui` attributes and create `OrbitalUIObject` instances for them. These child objects will be accessible through the `ui` property of the parent object in a hierarchical manner, allowing you to easily access nested UI elements.

e.g.

```html
<div id="parent" data-ui="panel">
  <button data-ui="button1">Button 1</button>
  <button data-ui="button2">Button 2</button>
  <div data-ui="subpanel">
    <button data-ui="button3">Button 3</button>
  </div>
</div>
```

```js
const parentElement = document.querySelector("#parent");
const parentUIObject = new OrbitalUIObject(parentElement);
// Access a child element with data-ui="child"
const button1 = parentUIObject.ui.button1; // OrbitalUIObject for button1
const button2 = parentUIObject.ui.button2; // OrbitalUIObject for button2
const subpanel = parentUIObject.ui.subpanel; // OrbitalUIObject for subpanel
const button3 = subpanel.ui.button3; // OrbitalUIObject for button3
// But also...
const button3Alt = parentUIObject.ui.subpanel.button3; // OrbitalUIObject for button3
```

## `BaseScreen` class

The `BaseScreen` class is a base class for creating screens in the application. It provides a structure for managing the screen's lifecycle, including initialization, event listeners, and cleanup. The `BaseScreen` itself is a subclass of `OrbitalUIObject`, so it inherits the functionality to discover child elements with `data-ui` attributes and manage their lifecycle.

When creating a new screen, you should extend the `BaseScreen` class and implement the necessary logic for that specific screen. The constructor takes four arguments:

- `controller`: the `ScreenController` instance that manages the screens.
- `element`: the DOM element representing the screen (usually obtained using `findUIElement`).
- `uiElementSelectors`: an optional object that allows you to use custom css selectors to find UI elements. The keys of the objects are names that will be used to access the elements in `this._els`, and the values are the css selectors to find them.
- `options`: an optional object that allows you to configure the screen behavior:
  - `visibleClass`: the CSS class to add to the container when the screen is shown. You can use this class to define the styles for the visible state of the screen, such as `display: block` or `opacity: 1`.
  - `hiddenClass`: the CSS class to add to the container when the screen is hidden. You can use this class to define the styles for the hidden state of the screen, such as `display: none` or `opacity: 0`.

Example:

```js
class MenuScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("menu-screen"), { buttons: ".orb-btn"});
  }
  ...
}
```

In this example, we'll have the possibility to access the `go-about` button through `this.ui.goAbout` (because of the `data-ui` attribute). But you can also access all the buttons inside the screen through `this._els.buttons`.

```js
class MenuScreen extends BaseScreen {
  ...
  initEventListeners() {
    this.ui.goAbout.element.addEventListener("click", () => this.controller.state.change("about"));
    this._els.buttons.forEach(button => {
      button.addEventListener("click", () => console.log("button clicked"));
    });
  }
}
```

> This is an example of how to use the `ui` and the `_els` properties, but you are advised to use 'on(event, callback)' method of the `OrbitalUIObject` to attach event listeners (on elements that have `data-ui` attributes), which is a more convenient way to handle events.

### The screen lifecycle

Any screen needs to be initialized by calling the `init()` method. This method will call the `initEventListeners()` method, which is where you should attach the event listeners for the screen. Each screen can be initialized only once, and the `init()` method will take care of it. If you try to call `init()` again, it will not re-initialize the screen.

> If you do not explicitly call `init()`, the screen will be initialized when it is shown for the first time. This is useful for screens that are not needed at the start of the application, as it will save resources until they are actually needed.

To show a screen, you should call the `show(payload)` method. This method will add the `visibleClass` to the screen container and remove the `hiddenClass`. It will also call the `activate(payload)` method, which is where you should implement the logic for when the screen is activated. The `payload` argument is optional and can be used to pass data to the screen when it is shown.

To hide a screen, you should call the `hide()` method. This method will add the `hiddenClass` to the screen container and remove the `visibleClass`. It will also call the `deactivate()` method, which is where you should implement the logic for when the screen is deactivated, to clean up any resources or stop any ongoing processes.

> You advised to not to override the `show()` and `hide()` methods, as they handle the visibility classes and call the `activate()` and `deactivate()` methods. Instead, you should implement your logic in the `activate(payload)` and `deactivate()` methods.

## `StateController` class

The `StateController` class is responsible for managing the application states and their transitions. It allows you to define states, set valid transitions between them, and handle events when entering or leaving a state.

Although not mandatory, it is recommended to use the `StateController` to manage the application states and transitions, and use the `ScreenController` to show or hide screens based on the current state. This separation of concerns keeps the application flow predictable and makes it easier to maintain. If you want to not to use the `StateController`, you can still use the `ScreenController` to manage screens directly, but you will lose the benefits of having a clear state machine and the associated events.

When the `StateController` is created, it starts in a `null` state. So you need to set an initial state using the `change()` method. 

### Defining states and transitions

The `setStateTransitions(transitions)` method allows you to define the valid transitions between states. The `transitions` argument is an object where the keys are the state names and the values are arrays of valid next states.

e.g.

```js
this.setStateTransitions({
  menu: ["about"],
  about: ["menu"],
});
```

That means that from the `menu` state you can go to the `about` state, and from the `about` state you can go back to the `menu` state. Any attempt to change to a state that is not in the valid transitions will trigger an error and the state will not change.

### Changing states

When using the `change(newState, payload)` method, the `StateController` will check if the transition from the current state to the `newState` is valid. 

If a state transition is valid, it will trigger a _leave_ event for the current state and an _enter_ event for the new state (in the `StateController` events system). 

To listen to these events, you can use the `on("enter", state, callback)` and `on("leave", state, callback)` methods.

The callback functions for these events will have the following signature:

- `callback(prevState, newState, controller)`: where `newState` is the state being entered, `prevState` is the state being left, and `controller` is the instance of the `StateController`.

> To keep the state machine predictable, you should always navigate through state changes, and showing or hiding screens according to the state transitions instead of directly manipulating the DOM. This ensures that the application flow is consistent and that screens are only shown when the state allows it.

To stop listening to a state event, you can call the function returned by the `on()` method. This will unregister the callback and prevent it from being called in the future. Alternatively, you can use the `off("enter", state, callback)` and `off("leave", state, callback)` methods to unregister a specific callback for a state event.

There is a set of syntactic sugar methods to register callbacks for entering or leaving a specific state:
- `onEnter(state, callback)`: registers a callback to be called when entering the specified state.
- `onLeave(state, callback)`: registers a callback to be called when leaving the specified state.
- `on(state, onEnterCallback, onLeaveCallback)`: registers callbacks for both entering and leaving the specified state.

### Event system in `StateController`

The `StateController` has an event system that allows you to emit and listen to custom events. You can use the `emit(event, ...args)` method to emit an event with optional arguments, and the `on(event, callback)` method to register a callback for a specific event.

# Internationalization (I18n)

`Orbital` includes a simple internationalization (I18n) system that allows you to translate the DOM using `data-i18n` attributes in HTML elements. It also supports programmatic translations through the `I18n` class.

To use the I18n system, you need to set the translations for each language and set the active language. The translations are defined as an object where the keys are the language codes and the values are objects containing the translation keys and their corresponding translated strings.

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
i18n.applyTranslations("es", {}, null, document.body);
```

The `data-i18n` attribute in HTML elements is used to specify the translation key for that element. When the active language is set, the I18n system will automatically update the text content of the elements with the corresponding translations.

```html
<h1 data-i18n="app.title">My game</h1>
<button data-i18n="menu.play">Play</button>
```

In that example, when the active language is set to `es`, the text content of the `<h1>` element will be updated to "Mi juego" and the text content of the `<button>` element will be updated to "Jugar".

## Programmatic translations

You can also translate strings programmatically using the `I18n.t(key, variables)` method. The `key` is the translation key, and the optional `variables` argument is an object containing values to replace in the translation string.

```js
const translatedString = I18n.t("menu.play");
```

## Translations with variables

A translation string can include variables that will be replaced with the provided values when the translation is applied. The variables are defined using curly braces `{}` in the translation string.

```js
i18n.setTranslations({
  es: {
    "score.value": "Puntos: {value}",
  },
});
```

When applying the translation, you can provide an object with the variable values to replace in the translation string.

```js
i18n.applyTranslations("es", { value: 120 }, null, document.body);
```

or

```js
I18n.t("score.value", { value: 120 });
```

## Scope

The `I18n` class supports translating specific scopes in the DOM. You can specify a scope element when applying translations, and only the elements within that scope will be translated.

The default scope is the entire document, and having a global I18n instance. But you can create a new instance of `I18n` and use it to translate a specific scope in the DOM. This is useful for translating specific sections of the application without affecting the entire document.

```js
const i18n = new I18n(options = {});
i18n.setTranslations({
  es: {
    "menu.play": "Jugar",
  },
});
i18n.applyTranslations("es", {}, null, document.querySelector("#menu"));
```

The `options` argument in the `I18n` constructor allows you to configure the behavior of the I18n instance. The available options are:
- `missingKeyCallback`: a callback function that will be called when a translation key is missing. The function receives the missing key and the current language as arguments. The callback must return a string to be used as the translation for the missing key. If no callback is provided, the missing key will be used as the translation.

## Utilities

The `i18n` instance provides utility methods to help with creating the translations

- `extractStringsFromHTML(nodes = null, scope = document)`: This method extracts all the strings from the HTML elements with `data-i18n` attributes within the specified scope. It returns an object containing the translation keys and their corresponding text content. This is useful for generating the initial translation files or for extracting strings from a specific section of the application.
- `setCollectStrings(enable = true)` and `getCollectedStrings()`: These methods allow you to enable or disable the collection of strings for translation. When enabled, the `I18n` instance will collect all the strings that are translated using the `t()` method and store them in an internal object. You can retrieve the collected strings using the `getCollectedStrings()` method. This is useful for generating translation files or for keeping track of the strings that need to be translated.

# Recipes

## How to add a new screen

1. Add an `orb-screen` section with its own `data-ui` attribute, to the HTML structure.
2. Create a class that extends BaseScreen
3. Implement the `initEventListeners()` method to attach the event listeners for the screen (if any).
4. Implement the `activate(payload)` and `deactivate()` methods to handle the screen lifecycle.
5. Add the screen to the `ScreenController` instance using the `add(name, screen)` method.
6. Make that the screen is shown when the state changes to the corresponding state, by using the `on("enter", state, callback)` method of the `StateController` instance.

Short example:

```html
...
<section data-ui="settings-screen" class="orb-screen not-active">
  <div class="orb-screen-content">
    <h1>Settings</h1>
    <button data-ui="settings-back">Back</button>
  </div>
</section>
...
```

```js
class SettingsScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("settings-screen"));
  }

  initEventListeners() {
    this.on("settings-back", "click", () => this.controller.state.change("menu"));
  }
}
```

# CSS styles

The base stylesheet lives in `style.css` and includes styles for several components of the application. It is recommended to use these base styles as a starting point and customize them as needed for your application.

## Screens

The basic structure is as follows:

```html
<main class="orb-app-shell">
  <section data-ui="menu-screen" class="orb-screen not-active">
    <div class="orb-screen-content">...</div>
  </section>
  <section data-ui="about-screen" class="orb-screen not-active">
    <div class="orb-screen-content">...</div>
  </section>
</main>
```


- `orb-app-shell`: This is the main container, that makes the application behave like a single-page app, and contains all the screens.
- `orb-screen`: Each screen container, which is hidden by default and shown when the corresponding state is active.
- `orb-screen-content`: Inner layout for each screen.
- `orb-screen-stacked-group`: If you want to make that multiple screen contents are stacked on top of each other, allowing for a layered effect, you can use this class in the parent container of the screens. For example, you can have a screen with the control panel, another screen with the game content, and another with a content when the game is paused, you can show or hide the pause screen without affecting the other two screens, and the pause screen will be stacked on top of the game content screen.

## Effects

There are multiple classes for transitions and animations that can be applied to screens (or other elements). These classes can be combined to create complex effects.

- `orb-fade-in`, `orb-fade-out`: fade in and fade out effects.
- `orb-slide-up`, `orb-slide-down`, `orb-slide-left`, `orb-slide-right`: slide in and slide out effects from different directions.
- `orb-scale-up`, `orb-scale-down`, `orb-scale-bounce`: scale in and scale out effects, with a bounce effect
- `orb-shake`: shake effect
- `orb-rotate-in-center`: rotate in effect from the center

Moreover they can be combined with the following classes to control the speed and intensity of the effects:
- `orb-effect-strong`, `orb-effect-weak`: control the intensity of the effect (i.e. the magnitude of the transformation).
- `orb-fast`, `orb-very-fast`, `orb-slow`, `orb-very-slow`: control the speed of the effect (i.e. the duration of the animation).

## Buttons

Although this framework is not focused on providing a complete UI library, it includes some basic styles for buttons and modals that can be used as a starting point for your application.

- `orb-btn`: basic button style.
- `orb-btn icon-btn`: button with an icon.
- `xl`, `xxl`: extra large button sizes.
- `orb-button-group`: a container for grouping buttons together.

To help styling buttons, there are several variables that you can customize for your buttons:

```css
:root {
  --orb-btn-text-color: #F5F1FF;
  --orb-btn-background: rgba(255, 255, 255, 0.07);
  --orb-btn-border-strong: rgba(255, 255, 255, 0.15);
  --orb-btn-border: rgba(255, 255, 255, 0.14);
  --orb-btn-color: #FF5FA2;
  --orb-btn-color-light: #FF87BC;
  --orb-btn-color-dark: #C93E7B;
  --orb-btn-color-shadow: rgba(255, 95, 162, .35);
  --orb-btn-color-shadow-dark: rgba(255, 95, 162, .5);
}
```

