# JWG - JSWebGame

Libreria ligera para crear juegos web con HTML, CSS y JavaScript.

Incluye utilidades para:

- Navegacion entre pantallas
- Gestion de estado con transiciones
- Internacionalizacion (i18n)
- Helpers de utilidad para UI y tiempo

## Instalacion

### Desde npm (recomendado)

```bash
npm install js-web-game
```

### Desde repositorio git

```bash
npm install git+https://github.com/<tu-usuario>/jsWebGame.git
```

## Uso desde CDN (jsDelivr)

Puedes importar directamente la version en dist desde el repositorio.
El archivo dist/index.js se genera como un unico bundle ESM minificado:

```js
import * as jsWebGame from "https://cdn.jsdelivr.net/gh/dealfonso/jsWebGame/dist/index.js";

const { BaseScreen, GameController, StateController, I18n, utils } = jsWebGame;
```

Si quieres fijar una version para evitar cambios de ultima hora:

```js
import * as jsWebGame from "https://cdn.jsdelivr.net/gh/dealfonso/jsWebGame@v1.0.0/dist/index.js";
```

## Uso basico

```js
import { BaseScreen, GameController, StateController, I18n, utils } from "js-web-game";

// 1) Definir una pantalla
class MenuScreen extends BaseScreen {
	constructor(controller) {
		super(controller, "menu-screen", ["play-btn"]);
		this.init();
	}

	initEventListeners() {
		this._el.playBtn?.addEventListener("click", () => {
			this.controller.showScreen("game");
		});
	}
}

class GameScreen extends BaseScreen {
	constructor(controller) {
		super(controller, "game-screen");
		this.init();
	}
}

// 2) Configurar navegacion de pantallas
const gameController = new GameController();
gameController.addScreen("menu", new MenuScreen(gameController));
gameController.addScreen("game", new GameScreen(gameController));
gameController.showScreen("menu");

// 3) Gestion de estado
class PlayerState extends StateController {
	static transitions = {
		idle: ["running"],
		running: ["idle", "dead"],
		dead: []
	};
}

const playerState = new PlayerState("idle");
playerState.onEnter("running", (prev, next) => {
	console.log(`Estado: ${prev} -> ${next}`);
});
playerState.change("running");

// 4) Internacionalizacion
const i18n = I18n.getInstance();
i18n.setTranslations({
	en: { title: "My Game", play: "Play" },
	es: { title: "Mi Juego", play: "Jugar" }
});
i18n.setActiveLanguage("es");

// 5) Utilidad opcional
console.log(utils.formatTime(90500)); // 1:30
```

## Estructura exportada

El paquete exporta desde su entrada principal:

- BaseScreen
- GameController
- StateController
- I18n
- utils

## Notas

- El paquete esta preparado como ES Module.
- dist/index.js es un unico archivo bundleado y minificado.
- Para i18n en el DOM, usa atributos data-i18n en tus elementos HTML.
- Para regenerar dist despues de cambios en src, ejecuta npm run build.
