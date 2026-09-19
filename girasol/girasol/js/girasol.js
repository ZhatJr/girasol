/* =========================================================
   GIRASOL · girasol.js
   Arma las partes repetitivas del dibujo (pétalos, semillas,
   pasto, plantitas, estrellas y luciérnagas) y luego
   arranca la animación de entrada.
   ========================================================= */
(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const escena = document.getElementById('escena');
  let momentoInicio = Infinity; // cuándo empezó la animación de entrada

  /* ---------- Utilidades ---------- */

  // Azar "con semilla": el paisaje sale igual en cada visita.
  let semilla = 21092026;
  const azar = () => {
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entre = (min, max) => min + azar() * (max - min);
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)];
  const r2 = (n) => Math.round(n * 100) / 100;

  const crear = (etiqueta, atributos, padre) => {
    const el = document.createElementNS(SVG_NS, etiqueta);
    for (const [clave, valor] of Object.entries(atributos)) el.setAttribute(clave, valor);
    if (padre) padre.appendChild(el);
    return el;
  };

  // Guarda un tiempo (en segundos) en una variable CSS del elemento.
  const tiempo = (el, segundos, variable = '--d') => {
    el.style.setProperty(variable, `${segundos.toFixed(3)}s`);
  };

  /* ---------- Forma del terreno ---------- */

  // El lienzo mide 400 de ancho, pero el paisaje sigue hacia los
  // costados para cubrir pantallas anchas (computadora, celular echado).
  const X_MIN = -1500;
  const X_MAX = 1900;

  const alturaLejana = (x) =>
    590 + 16 * Math.sin(x / 230 + 0.4) + 9 * Math.sin(x / 97 + 2.1) + 5 * Math.sin(x / 41 + 0.3);
  const alturaMedia = (x) =>
    648 + 14 * Math.sin(x / 180 + 2.6) + 7 * Math.sin(x / 73 + 0.9);
  const alturaCercana = (x) =>
    706 + 6 * Math.sin(x / 150 + 1.1) + 3.5 * Math.sin(x / 61 + 2.2) -
    14 * Math.exp(-(((x - 200) / 170) ** 2)); // lomita debajo del girasol

  const trazarColina = (altura) => {
    let d = `M${X_MIN} 900 L${X_MIN} ${r2(altura(X_MIN))}`;
    for (let x = X_MIN + 10; x <= X_MAX; x += 10) d += ` L${x} ${r2(altura(x))}`;
    return `${d} L${X_MAX} 900 Z`;
  };

  // Una mata = 3 hojitas finas dentro de un mismo trazo.
  const mataDePasto = (x, y, alto, grosor = 1) => {
    let d = '';
    for (let k = -1; k <= 1; k++) {
      const bx = x + k * 2.4 * grosor + entre(-1, 1);
      const h = alto * entre(0.6, 1);
      const curva = entre(-0.4, 0.4) * h;
      const w = entre(1.2, 1.9) * grosor;
      d += `M${r2(bx - w)} ${r2(y)}` +
        `Q${r2(bx - w * 0.3 + curva * 0.35)} ${r2(y - h * 0.55)} ${r2(bx + curva)} ${r2(y - h)}` +
        `Q${r2(bx + w * 0.3 + curva * 0.35)} ${r2(y - h * 0.55)} ${r2(bx + w)} ${r2(y)}Z`;
    }
    return d;
  };

  /* ---------- 1. Colinas ---------- */

  const construirColinas = () => {
    document.getElementById('colina-lejana').setAttribute('d', trazarColina(alturaLejana));
    document.getElementById('colina-media').setAttribute('d', trazarColina(alturaMedia));
    document.getElementById('colina-cercana').setAttribute('d', trazarColina(alturaCercana));

    // Matitas oscuras sobre la colina de adelante, para darle textura.
    const colores = ['#2c6431', '#34723a', '#27592c'];
    const trazos = colores.map(() => '');
    for (let n = 0; n < 200; n++) {
      const x = entre(-1000, 1400);
      const hondo = entre(16, 104);
      const i = Math.floor(azar() * colores.length);
      trazos[i] += mataDePasto(x, alturaCercana(x) + hondo, 6 + hondo * 0.13 + entre(0, 4), 0.8 + hondo / 110);
    }
    const textura = document.getElementById('textura-pasto');
    trazos.forEach((d, i) => d && crear('path', { d, fill: colores[i] }, textura));
  };

  /* ---------- 2. Pasto ---------- */

  // El pasto va en tramos de 100 unidades que brotan desde el
  // centro hacia los costados.
  const sembrarFila = (grupo, { paso, bajo, altoMin, altoMax, colores, inicio }) => {
    const TRAMO = 100;
    for (let x0 = X_MIN; x0 < X_MAX; x0 += TRAMO) {
      const trazos = colores.map(() => '');
      for (let x = x0 + entre(0, paso); x < x0 + TRAMO; x += paso * entre(0.7, 1.3)) {
        const i = Math.floor(azar() * colores.length);
        trazos[i] += mataDePasto(x, alturaCercana(x) + bajo, entre(altoMin, altoMax));
      }
      const tramo = crear('g', { class: 'mata-pasto' }, grupo);
      const distancia = Math.min(Math.abs(x0 + TRAMO / 2 - 200), 1400);
      tiempo(tramo, inicio + (distancia / 1400) * 0.9);
      trazos.forEach((d, i) => d && crear('path', { d, fill: colores[i] }, tramo));
    }
  };

  const construirPasto = () => {
    sembrarFila(document.getElementById('pasto-atras'), {
      paso: 10, bajo: 3, altoMin: 9, altoMax: 17, inicio: 1.1,
      colores: ['#2e6832', '#377538', '#295d2d'],
    });

    const delante = document.getElementById('pasto-delante');
    sembrarFila(delante, {
      paso: 12, bajo: 7, altoMin: 11, altoMax: 21, inicio: 1.2,
      colores: ['#428a41', '#4d9848', '#3a7d3c', '#59a550'],
    });

    // Montoncito de tierra y pasto que tapa la base del tallo.
    const base = crear('g', { class: 'mata-pasto' }, delante);
    tiempo(base, 1.2);
    crear('ellipse', { cx: 200, cy: 700, rx: 24, ry: 6, fill: 'url(#grad-cercana)' }, base);
    let pastoBase = '';
    for (let x = 184; x <= 216; x += 5) pastoBase += mataDePasto(x, 702 + entre(0, 2), entre(12, 19));
    crear('path', { d: pastoBase, fill: '#4a9546' }, base);
  };

  /* ---------- 3. Tallo ---------- */

  const prepararTallo = () => {
    // Largo exacto del tallo, para "dibujarlo" de abajo hacia arriba.
    document.querySelectorAll('.tallo-trazo').forEach((trazo) => {
      trazo.style.setProperty('--largo', `${(trazo.getTotalLength() + 2).toFixed(1)}px`);
    });
  };

  /* ---------- 4. Flor ---------- */

  const PASO = 360 / 21; // 21 pétalos por vuelta, como los girasoles reales
  const PETALO_DELANTE = 'M0 -34C-14 -50 -13 -92 0 -114C13 -92 14 -50 0 -34Z';
  const PETALO_ATRAS = 'M0 -32C-15 -52 -14 -98 0 -122C14 -98 15 -52 0 -32Z';
  const VENAS_DELANTE = 'M0 -46V-104M-3.5 -48Q-5.5 -76 -1.8 -100M3.5 -48Q5.5 -76 1.8 -100';
  const VENAS_ATRAS = 'M0 -46V-110';

  const ponerPetalos = (grupo, forma, relleno, venas, giroExtra, inicio) => {
    for (let i = 0; i < 21; i++) {
      const giro = i * PASO + giroExtra + entre(-2, 2);
      const pos = crear('g', {
        transform: `rotate(${r2(giro)}) scale(${r2(entre(0.95, 1.05))} ${r2(entre(0.94, 1.05))})`,
      }, grupo);
      const petalo = crear('g', { class: 'petalo' }, pos);
      tiempo(petalo, inicio + i * 0.036);
      crear('path', {
        d: forma, fill: relleno, stroke: '#b5630a', 'stroke-opacity': 0.3, 'stroke-width': 0.7,
      }, petalo);
      crear('path', {
        d: venas, fill: 'none', stroke: '#c0700c', 'stroke-opacity': 0.35,
        'stroke-width': 0.8, 'stroke-linecap': 'round',
      }, petalo);
    }
  };

  const construirFlor = () => {
    // Hojitas verdes del capullo (quedan detrás de los pétalos).
    const bracteas = document.getElementById('bracteas');
    for (let i = 0; i < 21; i++) {
      const pos = crear('g', { transform: `rotate(${r2(i * PASO + PASO / 4)})` }, bracteas);
      const bractea = crear('path', {
        class: 'bractea',
        d: 'M-8 -36C-10 -52 -5 -66 0 -80C5 -66 10 -52 8 -36Z',
        fill: 'url(#grad-bractea)',
      }, pos);
      tiempo(bractea, 2.7 + i * 0.012);
    }

    ponerPetalos(document.getElementById('petalos-atras'), PETALO_ATRAS, 'url(#grad-petalo-atras)', VENAS_ATRAS, PASO / 2, 3.05);
    ponerPetalos(document.getElementById('petalos-delante'), PETALO_DELANTE, 'url(#grad-petalo)', VENAS_DELANTE, 0, 3.3);

    // Semillas en espiral con el ángulo áureo (137,5°),
    // el mismo patrón que tiene un girasol de verdad.
    const semillas = document.getElementById('semillas');
    const TOTAL = 240;
    const RADIO = 43;
    const ANGULO_AUREO = Math.PI * (3 - Math.sqrt(5));
    for (let n = 1; n <= TOTAL; n++) {
      const t = Math.sqrt(n / TOTAL);
      const a = n * ANGULO_AUREO;
      const s = crear('circle', {
        class: 'semilla',
        cx: r2(RADIO * t * Math.cos(a)),
        cy: r2(RADIO * t * Math.sin(a)),
        r: r2(1.1 + t),
        fill: `hsl(${r2(24 + 12 * t)}, 70%, ${r2(8 + 32 * t ** 2.6)}%)`,
      }, semillas);
      tiempo(s, 3.35 + n * 0.0045);
    }
  };

  /* ---------- 5. Plantitas ---------- */

  const construirPlantitas = () => {
    const plantas = document.getElementById('plantas');

    const plantar = (tipo, x, escala, hondo, inicio, espejo = azar() < 0.5) => {
      const y = alturaCercana(x) + hondo;
      const pos = crear('g', {
        transform: `translate(${r2(x)} ${r2(y)}) scale(${r2(espejo ? -escala : escala)} ${r2(escala)})`,
      }, plantas);
      const crece = crear('g', { class: 'planta-crece' }, pos);
      tiempo(crece, inicio);
      const mece = crear('g', { class: 'planta-mece' }, crece);
      tiempo(mece, entre(3.2, 5.8), '--t');
      tiempo(mece, -entre(0, 6), '--dm');
      crear('use', { href: `#${tipo}` }, mece);
    };

    // [tipo, x, escala, qué tan abajo, cuándo brota]
    [
      ['mata', 26, 1.25, 8, 2.2],
      ['florecitas', 70, 1, 8, 2.9],
      ['brote', 116, 0.9, 9, 2.5],
      ['trebol', 150, 0.95, 9, 3.3],
      ['brote', 236, 0.72, 9, 3.0],
      ['helecho', 266, 1, 8, 2.4],
      ['mata', 308, 1.05, 8, 2.7],
      ['florecitas', 352, 1.15, 8, 3.4],
      ['brote', 388, 1, 9, 2.6],
      // más cerca de quien mira: más abajo y más grandes
      ['mata', 48, 1.7, 64, 2.8],
      ['florecitas', 112, 1.35, 82, 3.6],
      ['trebol', 296, 1.45, 74, 3.1],
      ['mata', 362, 1.6, 58, 3.5],
    ].forEach(([tipo, x, escala, hondo, inicio]) => plantar(tipo, x, escala, hondo, inicio));

    // Más plantitas a los costados para pantallas anchas.
    const tipos = ['mata', 'brote', 'florecitas', 'trebol', 'helecho'];
    const plantarLado = (desde, hasta, sentido) => {
      for (let x = desde; sentido * (hasta - x) > 0; x += sentido * entre(60, 120)) {
        const cerca = azar() < 0.35;
        plantar(
          elegir(tipos), x,
          cerca ? entre(1.2, 1.7) : entre(0.8, 1.2),
          cerca ? entre(40, 90) : entre(7, 10),
          entre(2.2, 3.9)
        );
      }
    };
    plantarLado(-50, -900, -1);
    plantarLado(450, 1300, 1);
  };

  /* ---------- 6. Estrellas y luciérnagas ---------- */

  const construirLuces = () => {
    const estrellas = document.getElementById('estrellas');
    for (let i = 0; i < 60; i++) {
      const e = document.createElement('i');
      e.className = 'estrella';
      e.style.left = `${entre(0, 100).toFixed(2)}%`;
      e.style.top = `${(azar() ** 1.5 * 56).toFixed(2)}%`;
      e.style.setProperty('--tam', `${entre(1, 2.3).toFixed(2)}px`);
      e.style.setProperty('--brillo', entre(0.45, 1).toFixed(2));
      tiempo(e, entre(1.8, 4.6), '--dur');
      tiempo(e, -entre(0, 4.6), '--del');
      estrellas.appendChild(e);
    }

    const luciernagas = document.getElementById('luciernagas');
    const cantidad = Math.min(30, Math.max(14, Math.round(window.innerWidth / 45)));
    for (let i = 0; i < cantidad; i++) {
      const luz = document.createElement('span');
      luz.className = 'luz';
      luz.style.setProperty('--x', `${entre(3, 97).toFixed(2)}%`);
      luz.style.setProperty('--y', `${entre(34, 94).toFixed(2)}%`);
      luz.style.setProperty('--tam', `${entre(3, 6.5).toFixed(2)}px`);
      luz.style.setProperty('--dx', `${entre(-60, 60).toFixed(1)}px`);
      luz.style.setProperty('--dy', `${entre(60, 180).toFixed(1)}px`);
      tiempo(luz, entre(9, 17), '--dur');
      tiempo(luz, -entre(0, 17), '--del');
      luciernagas.appendChild(luz);
    }
  };

  /* ---------- 7. Respaldo para navegadores antiguos ---------- */

  const ajustarTamano = () => {
    if (window.CSS && CSS.supports('width', '1cqw')) return;
    const ajustar = () => {
      const u = Math.min(escena.clientWidth / 400, escena.clientHeight / 800);
      escena.style.setProperty('--u', `${u}px`);
    };
    ajustar();
    window.addEventListener('resize', ajustar);
  };

  /* ---------- 8. Detalle al tocar: el girasol suelta polen ---------- */

  const activarToque = () => {
    const cabeza = document.getElementById('cabeza');
    let ultimoToque = 0;

    const soltarPolen = () => {
      const caja = cabeza.getBoundingClientRect();
      const cx = caja.left + caja.width / 2;
      const cy = caja.top + caja.height / 2;

      cabeza.animate(
        [
          { transform: 'rotate(0deg) scale(1)' },
          { transform: 'rotate(-5deg) scale(1.04)' },
          { transform: 'rotate(4deg) scale(1.03)' },
          { transform: 'rotate(-2deg) scale(1.01)' },
          { transform: 'rotate(0deg) scale(1)' },
        ],
        { duration: 950, easing: 'ease-in-out' }
      );

      for (let i = 0; i < 20; i++) {
        const polen = document.createElement('span');
        polen.className = 'polen';
        const tam = 4 + Math.random() * 6;
        const angulo = Math.random() * Math.PI * 2;
        const desde = caja.width * 0.15;
        const hasta = caja.width * (0.35 + Math.random() * 0.5);
        polen.style.width = `${tam}px`;
        polen.style.height = `${tam}px`;
        polen.style.left = `${cx + Math.cos(angulo) * desde - tam / 2}px`;
        polen.style.top = `${cy + Math.sin(angulo) * desde - tam / 2}px`;
        escena.appendChild(polen);

        const dx = Math.cos(angulo) * hasta;
        const dy = Math.sin(angulo) * hasta;
        polen.animate(
          [
            { transform: 'translate(0, 0) scale(0.4)', opacity: 0 },
            { transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) scale(1)`, opacity: 1, offset: 0.3 },
            { transform: `translate(${dx}px, ${dy - 40 - Math.random() * 50}px) scale(0.5)`, opacity: 0 },
          ],
          { duration: 1500 + Math.random() * 1000, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }
        ).onfinish = () => polen.remove();
      }
    };

    escena.addEventListener('pointerdown', () => {
      const ahora = performance.now();
      const yaFlorecio = ahora - momentoInicio > 4800;
      if (!yaFlorecio || ahora - ultimoToque < 450) return;
      ultimoToque = ahora;
      soltarPolen();
    });
  };

  /* ---------- ¡Que florezca! ---------- */

  // Todas las animaciones arrancan juntas en el siguiente cuadro.
  const arrancar = () => {
    requestAnimationFrame(() => {
      escena.classList.add('iniciar');
      momentoInicio = performance.now();
    });
  };

  // Si el navegador muestra la página guardada (por ejemplo, al volver
  // con el botón "atrás"), la animación de entrada empieza de nuevo.
  window.addEventListener('pageshow', (evento) => {
    if (!evento.persisted) return;
    escena.classList.remove('iniciar');
    void escena.offsetWidth; // obliga al navegador a soltar las animaciones anteriores
    arrancar();
  });

  try {
    ajustarTamano();
    construirColinas();
    construirPasto();
    prepararTallo();
    construirFlor();
    construirPlantitas();
    construirLuces();
    activarToque();
  } catch (error) {
    console.error('No se pudo armar toda la escena:', error);
  } finally {
    arrancar();
  }
})();
