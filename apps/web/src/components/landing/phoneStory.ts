// Animación de las maquetas del teléfono (PhoneScreens.tsx): muestra cómo se
// usa la app del atleta. Un único guion dirige los tres teléfonos de la
// sección "Tu atleta lo registra en el celular", en el orden real:
//   Hoy → registro de serie → vuelta a Hoy → cierre de sesión.
// Solo el teléfono activo está nítido; un círculo hace de dedo y toca cada
// elemento. La pantalla "Hoy" de la portada tiene una microhistoria propia.
// Se anima solo mientras está a la vista y no con "reducir movimiento".
//
// Mueve el DOM directamente (clases y textos) porque son maquetas sin estado
// de React; PhoneScreens va en memo para que React no las vuelva a pintar.

const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const q = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;
const qa = (root: ParentNode, sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));

function pop(el: HTMLElement) {
  el.classList.add("lp-pop");
  window.setTimeout(() => el.classList.remove("lp-pop"), 420);
}

// Reloj de un guion: todo se programa respecto de t y se cancela de una vez.
function scheduler() {
  let timers: number[] = [];
  let t = 0;
  return {
    run: (fn: () => void) => void timers.push(window.setTimeout(fn, t)),
    at: (offset: number, fn: () => void) => void timers.push(window.setTimeout(fn, t + offset)),
    wait: (ms: number) => void (t += ms),
    stop: () => {
      timers.forEach(clearTimeout);
      timers = [];
      t = 0;
    },
  };
}
type Scheduler = ReturnType<typeof scheduler>;

// El dedo de un teléfono: se mueve hasta un elemento y lo toca.
function finger(dev: HTMLElement, S: Scheduler) {
  const screen = q(dev, ".lp-screen");
  const touch = document.createElement("i");
  touch.className = "lp-touch";
  screen.appendChild(touch);
  const center = (el: HTMLElement) => {
    const a = screen.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const k = a.width / 375;
    return [(r.left - a.left + r.width / 2) / k, (r.top - a.top + r.height / 2) / k];
  };
  return {
    hide: () => touch.classList.remove("lp-on", "lp-down"),
    home: () => {
      touch.classList.remove("lp-on", "lp-down");
      touch.style.transition = "none";
      touch.style.left = "187px";
      touch.style.top = "720px";
      void touch.offsetWidth;
      touch.style.transition = "";
    },
    go: (el: HTMLElement) => {
      S.run(() => {
        const [x, y] = center(el);
        touch.style.left = `${x}px`;
        touch.style.top = `${y}px`;
        touch.classList.add("lp-on");
      });
      S.wait(650);
    },
    press: (el: HTMLElement, fn?: () => void) => {
      S.run(() => {
        touch.classList.add("lp-down");
        el.classList.add("lp-pressed");
      });
      S.at(150, () => {
        touch.classList.remove("lp-down");
        el.classList.remove("lp-pressed");
        fn?.();
      });
      S.wait(450);
    },
    remove: () => touch.remove(),
  };
}

// Pantalla "Hoy": n = ejercicios completados (1 al inicio, 4 = todos).
function hoyScreen(dev: HTMLElement) {
  const NAMES = ["Sentadilla con barra", "Prensa de piernas", "Zancadas con mancuernas", "Peso muerto"];
  const SETS = [4, 3, 3, 3];
  const count = q(dev, ".lp-m-count b");
  const segs = qa(dev, ".lp-m-seg i");
  const btn = q(dev, ".lp-m-hbtn");
  const btnText = q(btn, "span");
  const cards = qa(dev, ".lp-m-ex");
  const progress = (n: number) => {
    count.textContent = String(n);
    segs.forEach((s, i) => s.classList.toggle("lp-on", i < n));
    btn.classList.toggle("lp-finish", n >= 4);
    btnText.textContent = n >= 4 ? "Cerrar sesión" : `Continuar: ${NAMES[n]}`;
    cards.forEach((card, i) => {
      const state = i < n ? "done" : i === n ? "cur" : "pending";
      const node = q(card, ".lp-node");
      const pill = q(card, ".lp-pill-n");
      card.classList.toggle("lp-cur", state === "cur");
      node.className = `lp-node${state === "done" ? " lp-done" : state === "cur" ? " lp-cur" : ""}`;
      node.innerHTML = state === "done" ? CHECK : String(i + 1);
      pill.className = `lp-pill-n${state === "done" ? " lp-ok" : state === "cur" ? " lp-cur" : ""}`;
      pill.textContent = `${state === "done" ? SETS[i] : 0}/${SETS[i]}`;
    });
  };
  return {
    btn,
    reset: () => progress(1),
    progress: (n: number) => {
      progress(n);
      pop(count);
    },
  };
}

// Pantalla "Registro de serie".
function serieScreen(dev: HTMLElement) {
  const steps = qa(dev, ".lp-m-step");
  const weight = q(steps[0], "strong");
  const plus = qa(steps[0], ".lp-m-stepbtn")[1];
  const chips = qa(steps[2], ".lp-chips span");
  const save = q(dev, ".lp-m-fixed .lp-m-btn");
  const pill = q(dev, ".lp-m-set span");
  return {
    plus,
    chip: chips[2],
    save,
    reset: () => {
      weight.firstChild!.nodeValue = "120";
      chips.forEach((c) => c.classList.remove("lp-on"));
      save.classList.remove("lp-done");
      save.textContent = "Guardar serie";
      pill.textContent = "Serie 2 de 3";
    },
    bumpWeight: () => {
      weight.firstChild!.nodeValue = "122.5";
      pop(weight);
    },
    pickReps: () => chips.forEach((c, i) => c.classList.toggle("lp-on", i === 2)),
    saved: () => {
      save.classList.add("lp-done");
      save.innerHTML = `${CHECK} Serie guardada`;
      pop(save);
      window.setTimeout(() => {
        pill.textContent = "Serie 3 de 3";
        pop(pill);
      }, 600);
    },
  };
}

// Pantalla "Cierre de sesión".
function cierreScreen(dev: HTMLElement) {
  const beads = qa(dev, ".lp-effort i");
  const notes = q(dev, ".lp-m-notes");
  const send = q(dev, ".lp-m-fixed .lp-m-btn");
  return {
    bead: beads[6],
    notes,
    send,
    text: "Me sentí fuerte hoy",
    reset: () => {
      beads.forEach((b) => b.classList.remove("lp-on"));
      notes.textContent = "Notas para tu coach (opcional)";
      notes.classList.remove("lp-typed");
      send.classList.remove("lp-done");
      send.textContent = "Enviar";
    },
    fill: () => beads.forEach((b, i) => i < 7 && void window.setTimeout(() => b.classList.add("lp-on"), i * 70)),
    startNote: () => {
      notes.textContent = "";
      notes.classList.add("lp-typed");
    },
    sent: () => {
      send.classList.add("lp-done");
      send.innerHTML = `${CHECK} Enviado`;
      pop(send);
    },
  };
}

type Player = { start: () => void; stop: () => void; dispose: () => void };

// La historia completa de los tres teléfonos.
function story(box: HTMLElement): Player {
  const figs = qa(box, "figure");
  const devs = figs.map((f) => q(f, ".lp-device"));
  const S = scheduler();
  const H = hoyScreen(devs[0]);
  const SE = serieScreen(devs[1]);
  const C = cierreScreen(devs[2]);
  const F = devs.map((d) => finger(d, S));
  // En móvil los teléfonos van en un carrusel horizontal: se centra el activo
  // (solo en horizontal, sin mover la página).
  const narrow = window.matchMedia("(max-width: 820px)");
  const centerFigure = (fig: HTMLElement) => {
    const b = box.getBoundingClientRect();
    const f = fig.getBoundingClientRect();
    box.scrollTo({ left: box.scrollLeft + (f.left - b.left) - (b.width - f.width) / 2, behavior: "smooth" });
  };
  const active = (i: number) =>
    S.run(() => {
      figs.forEach((f, k) => f.classList.toggle("lp-active", k === i));
      F.forEach((f, k) => k !== i && f.hide());
      if (narrow.matches) centerFigure(figs[i]);
    });
  const idle = () => {
    figs.forEach((f) => f.classList.remove("lp-active"));
    F.forEach((f) => f.hide());
  };

  const loop = () => {
    S.stop();
    box.classList.add("lp-story");
    H.reset();
    SE.reset();
    C.reset();
    F.forEach((f) => f.home());
    idle();
    S.wait(700);
    // 1. Hoy: elige continuar
    active(0);
    S.wait(500);
    F[0].go(H.btn);
    F[0].press(H.btn);
    S.wait(250);
    // 2. Registro de serie
    active(1);
    S.wait(800);
    F[1].go(SE.plus);
    F[1].press(SE.plus, SE.bumpWeight);
    S.wait(250);
    F[1].go(SE.chip);
    F[1].press(SE.chip, SE.pickReps);
    S.wait(250);
    F[1].go(SE.save);
    F[1].press(SE.save, SE.saved);
    S.wait(1500);
    // 3. De vuelta en Hoy: el progreso avanza hasta terminar
    active(0);
    S.wait(700);
    S.run(() => H.progress(2));
    S.wait(900);
    S.run(() => H.progress(3));
    S.wait(550);
    S.run(() => H.progress(4));
    S.wait(900);
    F[0].go(H.btn);
    F[0].press(H.btn);
    S.wait(250);
    // 4. Cierre de sesión
    active(2);
    S.wait(800);
    F[2].go(C.bead);
    F[2].press(C.bead, C.fill);
    S.wait(650);
    F[2].go(C.notes);
    F[2].press(C.notes, C.startNote);
    for (let n = 1; n <= C.text.length; n++) S.at(n * 55, () => (C.notes.textContent = C.text.slice(0, n)));
    S.wait(C.text.length * 55 + 300);
    F[2].go(C.send);
    F[2].press(C.send, C.sent);
    S.wait(2200);
    S.run(idle);
    S.wait(900);
    S.run(loop);
  };

  const stop = () => {
    S.stop();
    box.classList.remove("lp-story");
    idle();
  };
  return {
    start: loop,
    stop,
    dispose: () => {
      stop();
      F.forEach((f) => f.remove());
    },
  };
}

// La pantalla "Hoy" de la portada: toca "Continuar" y el progreso avanza.
function hero(dev: HTMLElement): Player {
  const S = scheduler();
  const H = hoyScreen(dev);
  const F = finger(dev, S);
  const loop = () => {
    S.stop();
    H.reset();
    F.home();
    S.wait(900);
    F.go(H.btn);
    F.press(H.btn);
    S.wait(300);
    S.run(() => H.progress(2));
    S.wait(2600);
    S.run(() => F.hide());
    S.wait(700);
    S.run(loop);
  };
  const stop = () => {
    S.stop();
    F.hide();
  };
  return { start: loop, stop, dispose: () => (stop(), F.remove()) };
}

// Arranca las animaciones dentro de `root` y devuelve la función que las detiene.
export function startPhoneDemos(root: HTMLElement): () => void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const players: Player[] = [];
  const observers: IntersectionObserver[] = [];
  const watch = (el: HTMLElement | null, make: (el: HTMLElement) => Player, threshold: number) => {
    if (!el) return;
    const player = make(el);
    players.push(player);
    const io = new IntersectionObserver((entries) => (entries[0].isIntersecting ? player.start() : player.stop()), { threshold });
    io.observe(el);
    observers.push(io);
  };
  watch(root.querySelector<HTMLElement>(".lp-phones"), story, 0.25);
  watch(root.querySelector<HTMLElement>(".lp-hero-visual .lp-device"), hero, 0.35);
  return () => {
    observers.forEach((o) => o.disconnect());
    players.forEach((p) => p.dispose());
  };
}
