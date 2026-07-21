import { CuboRunner } from "./cubo-runner.js";
// import { ORB } from "https://cdn.jsdelivr.net/gh/dealfonso/Orbital@main/dist/index.js";
import { ORB } from "./src/index.js";

const { StateController, ScreenController, BaseScreen, I18n, findUIElement, OrbitalUIObject } = ORB;

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
    super(controller, findUIElement("menu-screen"));
  }

  initEventListeners() {
    console.log("Initializing event listeners for MenuScreen");

    this.on("menu-stars", "click", () => this.controller.state.change("stars"));
    this.on("menu-fireworks", "click", () => this.controller.state.change("fireworks"));
    this.on("menu-cubo", "click", () => this.controller.state.change("cubo"));
  }
}

class FireworksScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("fireworks-screen"));
    this.fireworks = null;
  }

  initEventListeners() {
    this.on("fireworks-back-btn", "click", () => this.controller.state.change("menu"));
    this.on("fireworks-reload-btn", "click", () => {
      if (this.fireworks) {
        this.fireworks.stop();
        this.fireworks.start();
      }
    });
  }

  activate() {
    super.activate();
    if (!this.fireworks) {
      this.fireworks = new Fireworks.default(this.ui.fireworksContainer.element);
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
    super(controller, findUIElement("stars-screen"));
    this.stars = null;
  }

  initEventListeners() {
    this.on("stars-back-btn", "click", () => this.controller.state.change("menu"));
    this.on("stars-reload-btn", "click", () => this.createStars());
  }

  activate() {
    super.activate();
    this.createStars();
  }

  deactivate() {
    super.deactivate();
    this.ui.starsContainer.element.innerHTML = "";
  }

  createStars() {
    this.ui.starsContainer.element.innerHTML = "";
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
        this.ui.starsContainer.element.appendChild(s);
    }
  }
}

class CuboScreen extends BaseScreen {
  constructor(controller) {
    super(controller, findUIElement("cubo-screen"), );
    this._cuboRunner = null;
    this._mejorPuntuacion = 0;
  }

  initEventListeners() {
    this.on("cubo-back-btn", "click", () => this.controller.state.change("menu"));
    this.on("cubo-jump", "click", () => this._cuboRunner.saltar());
    this.on("cubo-play", "click", () => {
      this._cuboRunner.iniciar();
      this.ui.cuboPlay.element.classList.add("hidden");
      this.ui.cuboJump.element.classList.remove("hidden");
    });
    this.on("cubo-restart", "click", () => {
      this._cuboRunner.iniciar();
      this.ui.cuboRestart.element.classList.add("hidden");
      this.ui.cuboJump.element.classList.remove("hidden");
    });
  }

  activate() {
    super.activate();
    this.ui.cuboContainer.element.innerHTML = "";
    this._cuboRunner = new CuboRunner(this.ui.cuboContainer.element, {
      alto: this.find("cubo-container").clientHeight,
      plataformasFlotantesSolidas: true,
      dobleSalto: true,
      onFinPartida: () => {
        this.ui.cuboRestart.element.classList.remove("hidden");
        this.ui.cuboJump.element.classList.add("hidden");

        // Pasamos el foco al botón de reinicio para que el usuario pueda pulsar Enter para reiniciar
        this.ui.cuboRestart.element.focus();

        const puntuacion = this._cuboRunner.getPuntuacion();
        if (puntuacion > this._mejorPuntuacion) {
          this._mejorPuntuacion = puntuacion;
          this.ui.cuboMarcador.mejor.element.textContent = this._mejorPuntuacion;
        }
      },
      onPuntuacion: (puntos) => {
        this.ui.cuboMarcador.puntos.element.textContent = puntos;
      }
    });

    this.ui.cuboMarcador.puntos.element.textContent = "0";
    this.ui.cuboMarcador.mejor.element.textContent = this._mejorPuntuacion;
    this.ui.cuboPlay.element.classList.remove("hidden");
    this.ui.cuboRestart.element.classList.add("hidden");
    this.ui.cuboJump.element.classList.add("hidden");
    this.ui.cuboPlay.element.focus();

    // Añadimos un listener para la tecla de espacio para saltar
    this._teclaEspacioListener = this.teclaEspacioListener.bind(this);
    document.addEventListener("keydown", this._teclaEspacioListener);

    this.ui.cuboContainer.on("click", () => this._cuboRunner.saltar());
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
    this.ui.cuboContainer.removeAllEventListeners("click");
    this.ui.cuboContainer.innerHTML = "";
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