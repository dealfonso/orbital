import { CuboRunner } from "./cubo-runner.js";
import { ORB } from "https://cdn.jsdelivr.net/gh/dealfonso/Orbital@main/dist/index.js";
// import { ORB } from "./src/index.js";

const { StateController, ScreenController, BaseScreen, I18n, findUIElement } = ORB;

function createElement(tag, classNames = [], attributes = {}) {
    const el = document.createElement(tag);
    if (classNames.length > 0) {
        el.classList.add(...classNames);
    }
    for (const [attr, value] of Object.entries(attributes)) {
        el.setAttribute(attr, value);
    }
    return el;
}

const translations = {
    es: {
        "game.title": "aplicacion de ejemplo",
        "game.subtitle": "esta es una aplicación de ejemplo para demostrar el funcionamiento de Orbital",
        "menu.title": "Selecciona una demo",
        "menu.stars": "Demo de estrellas",
        "menu.fireworks": "Demo de fuegos artificiales",
        "menu.cubo": "Demo del Freeomery Dash",
        "cubo.puntos": "Puntos",
        "cubo.mejor": "Mejor puntuación",
    }
}

I18n.getInstance().setCollectStrings(true);
I18n.getInstance().setTranslations(translations);

class ExampleStateController extends StateController {
  constructor() {
    super();
    this.setStateTransitions({
      "init": ["menu"],
      "menu": ["fireworks", "stars", "cubo"],
      "fireworks": ["menu"],
      "stars": ["menu"],
      "cubo": ["menu"],
    });
  }
}

class WelcomeScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("welcome-screen"));
  }

  activate() {
    super.activate();
    setTimeout(() => this.controller.state.change("menu"), 2000);
  }
}

class MenuScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("menu-screen"), [
      "menu-stars",
      "menu-fireworks",
      "menu-cubo"
    ]);
  }

  initEventListeners() {
    console.log("Initializing event listeners for MenuScreen");
    this._el.menuStars.addEventListener("click", () => this.controller.state.change("stars"));
    this._el.menuFireworks.addEventListener("click", () => this.controller.state.change("fireworks"));
    this._el.menuCubo.addEventListener("click", () => this.controller.state.change("cubo"));
  }
}

class FireworksScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("fireworks-screen"), ["fireworks-container", "fireworks-back-btn", "fireworks-reload-btn"]);
    this.fireworks = null;
  }

  initEventListeners() {
    this._el.fireworksBackBtn.addEventListener("click", () => this.controller.state.change("menu"));
    this._el.fireworksReloadBtn.addEventListener("click", () => {
      if (this.fireworks) {
        this.fireworks.stop();
        this.fireworks.start();
      }
    });
  }

  activate() {
    super.activate();
    if (!this.fireworks) {
      this.fireworks = new Fireworks.default(this._el.fireworksContainer);
    }
    this.fireworks.start();
  }
  
  deactivate() {
    super.deactivate();
    if (this.fireworks) {
      this.fireworks.stop();
    }
  }
}

class StarsScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("stars-screen"), ["stars-container", "stars-back-btn", "stars-reload-btn"]);
    this.stars = null;
  }

  initEventListeners() {
    this._el.starsBackBtn.addEventListener("click", () => this.controller.state.change("menu"));
    this._el.starsReloadBtn.addEventListener("click", () => this.createStars());
  }

  activate() {
    super.activate();
    this.createStars();
  }

  deactivate() {
    super.deactivate();
    this._el.starsContainer.innerHTML = "";
  }

  createStars() {
    this._el.starsContainer.innerHTML = "";
    for (let i = 0; i < 100; i++) {
        const s = createElement('div', ['star'].concat(['small', 'medium', 'large'][Math.floor(Math.random() * 3)]), {
            style: `
            top:${Math.random()*100}%;
            left:${Math.random()*100}%;
            --d:${2+Math.random()*4}s;
            --op:${0.3+Math.random()*0.5};
            --star-color: hsl(${Math.random()*360} 70% 80%);
            `
        });
        this._el.starsContainer.appendChild(s);
    }
  }
}

class CuboScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("cubo-screen"), [
      "cubo-container", "cubo-back-btn", "cubo-jump", "cubo-play", "cubo-restart", "cubo-marcador_puntos", "cubo-marcador_mejor"]);
    this._cuboRunner = null;
    this._mejorPuntuacion = 0;
  }

  initEventListeners() {
    this._el.cuboBackBtn.addEventListener("click", () => this.controller.state.change("menu"));
    this._el.cuboJump.addEventListener("click", () => this._cuboRunner.saltar());
    this._el.cuboPlay.addEventListener("click", () => {
      this._cuboRunner.iniciar();
      this._el.cuboPlay.classList.add("hidden");
      this._el.cuboJump.classList.remove("hidden");
    });
    this._el.cuboRestart.addEventListener("click", () => {
      this._cuboRunner.iniciar();
      this._el.cuboRestart.classList.add("hidden");
      this._el.cuboJump.classList.remove("hidden");
    });
  }

  activate() {
    super.activate();
    this._el.cuboContainer.innerHTML = "";
    this._cuboRunner = new CuboRunner(this._el.cuboContainer, {
      plataformasFlotantesSolidas: true,
      dobleSalto: true,
      onFinPartida: () => {
        this._el.cuboRestart.classList.remove("hidden");
        this._el.cuboJump.classList.add("hidden");

        // Pasamos el foco al botón de reinicio para que el usuario pueda pulsar Enter para reiniciar
        this._el.cuboRestart.focus();

        const puntuacion = this._cuboRunner.getPuntuacion();
        if (puntuacion > this._mejorPuntuacion) {
          this._mejorPuntuacion = puntuacion;
          this._el.cuboMarcadorMejor.textContent = this._mejorPuntuacion;
        }
      },
      onPuntuacion: (puntos) => {
        this._el.cuboMarcadorPuntos.textContent = puntos;
      }
    });
    this._el.cuboMarcadorPuntos.textContent = "0";
    this._el.cuboMarcadorMejor.textContent = this._mejorPuntuacion;
    this._el.cuboPlay.classList.remove("hidden");
    this._el.cuboRestart.classList.add("hidden");
    this._el.cuboJump.classList.add("hidden");
    this._el.cuboPlay.focus(); 

    // Añadimos un listener para la tecla de espacio para saltar
    this._teclaEspacioListener = this.teclaEspacioListener.bind(this);
    document.addEventListener("keydown", this._teclaEspacioListener);

    this._el.cuboContainer.handler = () => this._cuboRunner.saltar();
    this._el.cuboContainer.addEventListener("click", this._el.cuboContainer.handler);
  }

  teclaEspacioListener(event) {
    if (event.code === "Space") {
      this._cuboRunner.saltar();
    }
  }

  deactivate() {
    super.deactivate();
    if (this._cuboRunner) {
      this._cuboRunner.destruir();
      this._cuboRunner = null;
    }
    document.removeEventListener("keydown", this._teclaEspacioListener);
    this._el.cuboContainer.removeEventListener("click", this._el.cuboContainer.handler);
    this._el.cuboContainer.handler = null;
    this._el.cuboContainer.innerHTML = "";
  }
}

class ExampleApp extends ScreenController {
  constructor() {
    super();
    this.appOptions = {
      language: "es",
    }

    this.state = new ExampleStateController();

    // Apply translations based on the saved language setting
    I18n.getInstance().setActiveLanguage(this.appOptions.language);
  }

  init() {
    I18n.getInstance().setActiveLanguage(this.appOptions.language);
    this.add("welcome", new WelcomeScreen(this));
    this.add("menu", new MenuScreen(this));
    this.add("fireworks", new FireworksScreen(this));
    this.add("stars", new StarsScreen(this));
    this.add("cubo", new CuboScreen(this));

    this.state.onEnter("init", () => this.show("welcome"));
    this.state.onEnter("menu", () => this.show("menu"));
    this.state.onEnter("fireworks", () => this.show("fireworks"));
    this.state.onEnter("stars", () => this.show("stars"));
    this.state.onEnter("cubo", () => this.show("cubo"));

    this.createBGStars(document.getElementById("stars"), 70, 4);

    this.state.change("init");
  }

  createBGStars(starsContainer, starCount = 70, planetCount = 4) {
    for(let i=0;i<starCount;i++){
      const s = createElement('div', ['little-star'], {
        style: `
          left:${Math.random()*100}%;
          top:${Math.random()*100}%;
          animation-delay:${Math.random()*3}s;
          opacity:${0.2 + Math.random() * 0.6};
        `
      });
      starsContainer.appendChild(s);
    }
  }      
}
      
document.addEventListener("DOMContentLoaded", () => {
  const app = new ExampleApp();
  app.init();
});