/**
 * CuboRunner
 * ------------------------------------------------------------
 * Motor mínimo (sin dependencias) para un juego infinito tipo
 * "Geometry Dash": un cubo que corre solo, salta pinchos y
 * plataformas.
 *
 * Esta versión NO usa <canvas>: cada elemento del juego (el
 * suelo, el jugador, cada pincho, cada plataforma) es un <div>
 * normal posicionado con CSS, así que se puede personalizar el
 * aspecto entero solo con CSS, sin tocar el JS.
 *
 * La clase SOLO gestiona el juego (física, obstáculos, posición
 * de los elementos). No crea ninguna interfaz (ni marcador, ni
 * pantalla de pausa, ni de fin de partida) y no escucha ningún
 * evento de teclado/ratón/touch por su cuenta. Todo eso es
 * responsabilidad de quien la use:
 *
 *   - Para saltar: llama a instancia.saltar() desde tu propio
 *     listener (click, tecla, botón, lo que sea).
 *   - Para saber qué está pasando: usa los callbacks (.on(...))
 *     o los métodos getPuntuacion(), estaJugando(), etc.
 *
 * Se puede crear más de una instancia a la vez (cada una en su
 * propio contenedor).
 *
 * Uso básico:
 *
 *   <div id="miJuego" style="width:800px;"></div>
 *   <script src="cubo-runner.js"></script>
 *   <script>
 *     const juego = new CuboRunner('#miJuego', {
 *       onFinPartida: (datos) => console.log('Puntos:', datos.puntuacion)
 *     });
 *
 *     juego.stage.addEventListener('click', () => juego.saltar());
 *     window.addEventListener('keydown', (e) => {
 *       if (e.code === 'Space') juego.saltar();
 *     });
 *
 *     juego.iniciar();
 *   </script>
 *
 * Personalizar el aspecto con CSS — sobrescribe estas clases
 * (los nombres están también en CuboRunner.CLASES):
 *
 *   .cubo-runner__stage               contenedor del juego
 *   .cubo-runner__suelo               el suelo
 *   .cubo-runner__jugador             el cubo del jugador
 *   .cubo-runner__pincho              obstáculo tipo pincho
 *   .cubo-runner__plataforma          plataforma sólida (llega al suelo)
 *   .cubo-runner__plataforma-flotante plataforma flotante
 *   .cubo-runner__plataforma-flotante--solida  añadida además de la anterior
 *                                              cuando plataformasFlotantesSolidas: true
 *
 * Ejemplo:
 *   <style>
 *     .cubo-runner__jugador { background: hotpink; border-radius: 50%; }
 *     .cubo-runner__pincho { background: black; clip-path: none; border-radius: 4px; }
 *   </style>
 *
 * API pública de cada instancia:
 *   iniciar()                  -> empieza / reinicia una partida
 *   pausar()                   -> pausa la partida en curso
 *   continuar()                -> reanuda tras pausar
 *   alternarPausa()
 *   saltar()                   -> dispara un salto (solo tiene efecto si toca el suelo/plataforma)
 *   destruir()                 -> detiene el juego y limpia el contenedor
 *   on(evento, cb) / off(...)  -> 'inicio' | 'pausa' | 'continuar' | 'finPartida' | 'puntuacion'
 *   getPuntuacion()
 *   getMejorPuntuacion()
 *   estaJugando()
 *   estaPausado()
 *   stage                      -> el <div> del área de juego, por si quieres enlazar tus propios eventos
 *   jugadorEl                  -> el <div> del cubo, por si necesitas acceder a él directamente
 *
 * opciones del constructor:
 *   {
 *     alto: 300,                          // alto del área de juego en px (ancho = 100% del contenedor)
 *     responsive: true,                   // si se reajusta al redimensionar la ventana
 *     plataformasFlotantesSolidas: false, // false: se puede saltar y atravesar la plataforma flotante desde abajo
 *                                         // true: saltar contra ella desde abajo colisiona (no se puede atravesar),
 *                                         //       pero se puede seguir cayendo/aterrizando encima con normalidad
 *     dobleSalto: false,                  // true: permite un segundo salto en el aire (desde la altura en la
 *                                         //       que esté), disponible de nuevo al tocar suelo o plataforma
 *     clasesExtra: {                      // clases CSS adicionales (se suman a las de por defecto)
 *       stage: '', suelo: '', jugador: '',
 *       pincho: '', plataforma: '', plataformaFlotante: ''
 *     },
 *     onInicio, onPausa, onContinuar, onFinPartida, onPuntuacion  // atajos a .on(...)
 *   }
 */
export class CuboRunner {
  static GRAVEDAD = 0.9;
  static SALTO_V = -15;
  static ALTO_SUELO = 40;

  static CLASES = {
    stage: 'cubo-runner__stage',
    suelo: 'cubo-runner__suelo',
    jugador: 'cubo-runner__jugador',
    pincho: 'cubo-runner__pincho',
    plataforma: 'cubo-runner__plataforma',
    plataformaFlotante: 'cubo-runner__plataforma-flotante',
    plataformaFlotanteSolida: 'cubo-runner__plataforma-flotante--solida'
  };

  constructor(contenedor, opciones = {}) {
    this.contenedor = typeof contenedor === 'string'
      ? document.querySelector(contenedor)
      : contenedor;

    if (!this.contenedor) {
      throw new Error('CuboRunner: no se encontró el contenedor indicado');
    }

    this.opciones = Object.assign({
      alto: 300,
      responsive: true,
      plataformasFlotantesSolidas: false,
      dobleSalto: false,
      clasesExtra: {}
    }, opciones);

    this._listeners = { inicio: [], pausa: [], continuar: [], finPartida: [], puntuacion: [] };
    if (opciones.onInicio) this.on('inicio', opciones.onInicio);
    if (opciones.onPausa) this.on('pausa', opciones.onPausa);
    if (opciones.onContinuar) this.on('continuar', opciones.onContinuar);
    if (opciones.onFinPartida) this.on('finPartida', opciones.onFinPartida);
    if (opciones.onPuntuacion) this.on('puntuacion', opciones.onPuntuacion);

    this.mejor = 0;

    this.jugando = false;
    this.pausado = false;
    this.finDePartida = false;

    this._destruido = false;
    this._rafId = null;
    this._ultimoTiempo = null;

    this._injectDefaultStyles();
    this._buildDOM();
    this._resize();
    this._resetEstado();
    this._actualizarDOM();

    if (this.opciones.responsive) {
      this._resizeHandler = () => { this._resize(); this._actualizarDOM(); };
      window.addEventListener('resize', this._resizeHandler);
    }
  }

  // ============================================================
  // API pública
  // ============================================================

  iniciar() {
    this._detenerBucle();
    this._resetEstado();
    this.jugando = true;
    this.pausado = false;
    this.finDePartida = false;
    this._actualizarDOM();
    this._iniciarBucle();
    this._emit('inicio');
  }

  pausar() {
    if (!this.jugando || this.finDePartida || this.pausado) return;
    this.pausado = true;
    this._detenerBucle();
    this._emit('pausa');
  }

  continuar() {
    if (!this.jugando || this.finDePartida || !this.pausado) return;
    this.pausado = false;
    this._iniciarBucle();
    this._emit('continuar');
  }

  alternarPausa() {
    this.pausado ? this.continuar() : this.pausar();
  }

  saltar() {
    if (!this.estaJugando()) return;
    const p = this.player;
    if (p.enElSuelo) {
      p.vy = CuboRunner.SALTO_V;
      p.enElSuelo = false;
      p.plataformaActual = null;
    } else if (this.opciones.dobleSalto && p.saltosExtraDisponibles > 0) {
      // segundo salto, desde la altura actual en el aire
      p.vy = CuboRunner.SALTO_V;
      p.saltosExtraDisponibles -= 1;
    }
  }

  destruir() {
    this._destruido = true;
    this._detenerBucle();
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    this.contenedor.innerHTML = '';
  }

  on(evento, cb) {
    if (this._listeners[evento]) this._listeners[evento].push(cb);
    return this;
  }

  off(evento, cb) {
    if (this._listeners[evento]) {
      this._listeners[evento] = this._listeners[evento].filter(f => f !== cb);
    }
    return this;
  }

  getPuntuacion() { return this.puntuacion; }
  getMejorPuntuacion() { return this.mejor; }
  estaJugando() { return this.jugando && !this.pausado && !this.finDePartida; }
  estaPausado() { return this.pausado; }

  // ============================================================
  // Internos — construcción del DOM
  // ============================================================

  _injectDefaultStyles() {
    if (document.getElementById('cubo-runner-estilos-base')) return;
    const C = CuboRunner.CLASES;
    const style = document.createElement('style');
    style.id = 'cubo-runner-estilos-base';
    style.textContent = `
      .${C.stage} {
        position: relative;
        overflow: hidden;
        background: #241848;
        border-radius: 12px;
      }
      .${C.suelo} {
        position: absolute;
        left: 0; right: 0; bottom: 0;
        background: #2f2166;
        border-top: 3px solid #ffcf5c;
        background-image: repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 2px, transparent 2px 34px);
        background-position-y: 8px;
      }
      .${C.jugador} {
        position: absolute;
        box-sizing: border-box;
        background: #ffcf5c;
        border-radius: 4px;
      }
      .${C.pincho} {
        position: absolute;
        background: #ff5c7c;
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
      }
      .${C.plataforma} {
        position: absolute;
        box-sizing: border-box;
        background: #5ce0c6;
        border-top: 4px solid #eafffa;
      }
      .${C.plataformaFlotante} {
        position: absolute;
        box-sizing: border-box;
        background: #7fa8ff;
        border-top: 3px solid #eaf2ff;
      }
    `;
    document.head.appendChild(style);
  }

  _clase(tipo) {
    const extra = this.opciones.clasesExtra && this.opciones.clasesExtra[tipo];
    return extra ? CuboRunner.CLASES[tipo] + ' ' + extra : CuboRunner.CLASES[tipo];
  }

  _buildDOM() {
    this.contenedor.innerHTML = '';

    const stage = document.createElement('div');
    stage.className = this._clase('stage');
    stage.style.width = '100%';
    stage.style.height = (this.opciones.alto || 300) + 'px';

    const suelo = document.createElement('div');
    suelo.className = this._clase('suelo');
    suelo.style.height = CuboRunner.ALTO_SUELO + 'px';

    const jugador = document.createElement('div');
    jugador.className = this._clase('jugador');
    jugador.style.left = '0';
    jugador.style.top = '0';
    jugador.style.width = '28px';
    jugador.style.height = '28px';
    jugador.style.willChange = 'transform';
    jugador.style.transformOrigin = '50% 50%';

    stage.appendChild(suelo);
    stage.appendChild(jugador);
    this.contenedor.appendChild(stage);

    this.stage = stage;
    this.sueloEl = suelo;
    this.jugadorEl = jugador;
  }

  _crearElementoObstaculo(o) {
    const el = document.createElement('div');
    el.style.left = '0';
    el.style.top = '0';
    el.style.willChange = 'transform';
    el.style.width = o.w + 'px';

    if (o.tipo === 'pincho') {
      el.className = this._clase('pincho');
      el.style.height = o.h + 'px';
    } else if (o.tipo === 'plataforma') {
      el.className = this._clase('plataforma');
      el.style.height = (this.groundY - o.top) + 'px';
    } else {
      let clases = this._clase('plataformaFlotante');
      if (this.opciones.plataformasFlotantesSolidas) clases += ' ' + CuboRunner.CLASES.plataformaFlotanteSolida;
      el.className = clases;
      el.style.height = o.grosor + 'px';
    }

    this.stage.appendChild(el);
    return el;
  }

  // ============================================================
  // Internos — bucle y física
  // ============================================================

  _iniciarBucle() {
    if (this._rafId !== null) return;
    this._ultimoTiempo = null;
    this._rafId = requestAnimationFrame(this._loop);
  }

  _detenerBucle() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _resize() {
    const alto = this.opciones.alto || 300;
    const anchoActual = this.stage.clientWidth;
    this.groundY = alto - CuboRunner.ALTO_SUELO;
    this._anchoStage = anchoActual;
    if (this.player && (this.player.enElSuelo || !this.jugando)) {
      this.player.y = this.groundY - this.player.h;
    }
  }

  _resetEstado() {
    if (this.obstaculos) {
      for (const o of this.obstaculos) if (o.el) o.el.remove();
    }
    this.player = {
      x: 70, y: 0, w: 28, h: 28, vy: 0,
      enElSuelo: true, plataformaActual: null, rotacion: 0,
      saltosExtraDisponibles: this.opciones.dobleSalto ? 1 : 0
    };
    this.player.y = this.groundY - this.player.h;
    this.obstaculos = [];
    this.velocidad = 6;
    this.distancia = 0;
    this.siguienteHueco = 220;
    this.puntuacion = 0;
    this.groundOffset = 0;
    this.finDePartida = false;
  }

  _rand(min, max) { return Math.random() * (max - min) + min; }

  _spawnObstaculo() {
    const anchoStage = this.stage.clientWidth;
    const groundY = this.groundY;
    const r = Math.random();
    let o;

    if (r < 0.5) {
      // pincho: hay que saltarlo entero
      const clusters = Math.random() < 0.25 ? 2 : 1;
      const w = 26 * clusters;
      const h = this._rand(28, 42);
      o = { tipo: 'pincho', x: anchoStage + 10, w, h, top: groundY - h };
    } else if (r < 0.75) {
      // plataforma sólida: llega hasta el suelo, hay que subirse encima
      const w = this._rand(80, 160);
      const elevacion = this._rand(45, 95);
      o = { tipo: 'plataforma', x: anchoStage + 10, w, top: groundY - elevacion };
    } else {
      // plataforma flotante: se puede pasar por debajo corriendo (o saltar encima)
      const w = this._rand(90, 170);
      const grosor = 14;
      const elevacion = this._rand(62, 100);
      o = { tipo: 'plataformaFlotante', x: anchoStage + 10, w, top: groundY - elevacion, grosor };
    }

    o.el = this._crearElementoObstaculo(o);
    this.obstaculos.push(o);
  }

  _morir() {
    this.finDePartida = true;
    this.jugando = false;
    this._detenerBucle();
    this._emit('finPartida', { puntuacion: this.puntuacion, mejor: this.mejor });
  }

  _comprobarColisiones() {
    const p = this.player;
    const groundY = this.groundY;

    for (const o of this.obstaculos) {
      if (o.tipo === 'pincho') {
        const inset = 6;
        const sx = o.x + inset, sw = o.w - inset * 2;
        const sy = groundY - o.h + inset, sh = o.h - inset;
        if (p.x + p.w > sx && p.x < sx + sw && p.y + p.h > sy && p.y < sy + sh) {
          this._morir();
          return;
        }
      } else if (o.tipo === 'plataforma') {
        // sólida de suelo a arriba: tocarla por el lado (sin ir encima) mata
        const overlapX = p.x + p.w > o.x && p.x < o.x + o.w;
        if (overlapX && p.y + p.h > o.top + 6) {
          this._morir();
          return;
        }
      } else if (o.tipo === 'plataformaFlotante' && this.opciones.plataformasFlotantesSolidas) {
        // modo "sólida desde abajo": solo colisiona si el jugador está
        // realmente dentro de la franja vertical de la plataforma (no
        // si pasa corriendo por debajo, muy por debajo de su grosor).
        // Aterrizar limpiamente encima tampoco cuenta como colisión.
        const overlapX = p.x + p.w > o.x && p.x < o.x + o.w;
        const platformBottom = o.top + o.grosor;
        const dentroFranjaVertical = p.y < platformBottom && p.y + p.h > o.top + 6;
        if (overlapX && dentroFranjaVertical) {
          this._morir();
          return;
        }
      }
      // plataformaFlotante en modo por defecto: nunca colisiona, se puede atravesar
    }
  }

  _actualizar(dt) {
    const p = this.player;
    const groundY = this.groundY;

    // ¿seguimos encima de una plataforma en la que aterrizamos antes?
    if (p.plataformaActual) {
      const pl = p.plataformaActual;
      const sigueEncima = p.x + p.w > pl.x && p.x < pl.x + pl.w;
      if (sigueEncima) {
        p.y = pl.top - p.h;
        p.vy = 0;
        p.enElSuelo = true;
      } else {
        p.plataformaActual = null;
      }
    }

    if (!p.plataformaActual) {
      p.vy += CuboRunner.GRAVEDAD * dt;
      let nuevaY = p.y + p.vy * dt;
      let aterrizo = false;

      for (const o of this.obstaculos) {
        if (o.tipo !== 'plataforma' && o.tipo !== 'plataformaFlotante') continue;
        const overlapX = p.x + p.w > o.x && p.x < o.x + o.w;
        if (overlapX && p.vy >= 0 &&
            (p.y + p.h) <= o.top + 1 &&
            (nuevaY + p.h) >= o.top) {
          p.y = o.top - p.h;
          p.vy = 0;
          p.enElSuelo = true;
          p.plataformaActual = o;
          p.saltosExtraDisponibles = this.opciones.dobleSalto ? 1 : 0;
          aterrizo = true;
          break;
        }
      }

      if (!aterrizo) {
        // si la plataforma flotante es "sólida", bloquea el ascenso desde abajo
        if (this.opciones.plataformasFlotantesSolidas && p.vy < 0) {
          for (const o of this.obstaculos) {
            if (o.tipo !== 'plataformaFlotante') continue;
            const overlapX = p.x + p.w > o.x && p.x < o.x + o.w;
            const bottom = o.top + o.grosor;
            if (overlapX && p.y >= bottom && nuevaY < bottom) {
              nuevaY = bottom;
              p.vy = 0;
              break;
            }
          }
        }

        if (nuevaY + p.h >= groundY) {
          p.y = groundY - p.h;
          p.vy = 0;
          p.enElSuelo = true;
          p.saltosExtraDisponibles = this.opciones.dobleSalto ? 1 : 0;
        } else {
          p.y = nuevaY;
          p.enElSuelo = false;
        }
      }
    }

    // giro visual del cubo
    if (!p.enElSuelo) {
      p.rotacion += 0.2 * dt;
    } else {
      const q = Math.PI / 2;
      p.rotacion = Math.round(p.rotacion / q) * q;
    }

    // mundo avanzando
    for (const o of this.obstaculos) o.x -= this.velocidad * dt;
    const salieron = this.obstaculos.filter(o => o.x + o.w <= -20);
    for (const o of salieron) o.el.remove();
    if (salieron.length) this.obstaculos = this.obstaculos.filter(o => o.x + o.w > -20);

    this.siguienteHueco -= this.velocidad * dt;
    if (this.siguienteHueco <= 0) {
      this._spawnObstaculo();
      this.siguienteHueco = this._rand(190, 360);
    }

    this.distancia += this.velocidad * dt;
    this.velocidad = Math.min(6 + this.distancia * 0.0008, 13);
    const nuevaPuntuacion = Math.floor(this.distancia / 10);
    if (nuevaPuntuacion !== this.puntuacion) {
      this.puntuacion = nuevaPuntuacion;
      this._emit('puntuacion', this.puntuacion);
    }

    this.groundOffset -= this.velocidad * dt;

    this._comprobarColisiones();
  }

  _actualizarDOM() {
    const p = this.player;
    this.jugadorEl.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rotacion}rad)`;
    for (const o of this.obstaculos) {
      o.el.style.transform = `translate(${o.x}px, ${o.top}px)`;
    }
    if (this.sueloEl) this.sueloEl.style.backgroundPositionX = this.groundOffset + 'px';
  }

  _emit(evento, datos) {
    (this._listeners[evento] || []).forEach(cb => {
      try { cb(datos); } catch (e) { console.error('CuboRunner: error en callback de "' + evento + '"', e); }
    });
  }

  _loop = (ts) => {
    if (this._destruido) return;

    if (this._ultimoTiempo === null) this._ultimoTiempo = ts;
    let dt = (ts - this._ultimoTiempo) / (1000 / 60);
    dt = Math.min(dt, 2.5);
    this._ultimoTiempo = ts;

    this._actualizar(dt);
    this._actualizarDOM();

    if (this.jugando && !this.pausado && !this.finDePartida) {
      this._rafId = requestAnimationFrame(this._loop);
    } else {
      this._rafId = null;
    }
  };
}