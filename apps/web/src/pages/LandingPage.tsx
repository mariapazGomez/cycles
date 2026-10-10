import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import logo from "../assets/logo-cycles.png";
import atencion from "../assets/landing/atencion.jpg";
import resumen from "../assets/landing/resumen.jpg";
import plan from "../assets/landing/plan.jpg";
import mAtencion from "../assets/landing/m-atencion.jpg";
import mResumen from "../assets/landing/m-resumen.jpg";
import mPlan from "../assets/landing/m-plan.jpg";
import { ChainCanvas } from "../components/landing/ChainCanvas";
import { CycleRing } from "../components/landing/CycleRing";
import { CierreDevice, HoyDevice, SerieDevice } from "../components/landing/PhoneScreens";
import { RotatingAudience } from "../components/landing/RotatingAudience";
import { startPhoneDemos } from "../components/landing/phoneStory";
import * as contactApi from "../services/contactApi";

// Landing para coaches (textos en docs/brand/landing.md; diseño aprobado el
// 2026-10-06). Es lo que ve quien entra a "/" sin sesión. Estructura al estilo
// de myfitnesspal.com con la marca de Cycles. Le habla al coach, pone el ciclo
// de entrenamiento al centro y ofrece acceso anticipado: el formulario escribe
// en POST /contact (y de ahí a Slack).
// Las capturas web son de una base de demostración con personas ficticias
// (apps/api/scripts/seed-demo.ts); las pantallas del teléfono son maquetas
// animadas (components/landing/phoneStory.ts).

const ARROW = (
  <svg className="lp-arrow" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// Barra fija con el llamado a la acción, solo en móvil (la oculta el CSS en
// escritorio). Aparece cuando el botón de la portada sale de pantalla y se
// esconde al llegar al formulario, para no tapar los campos.
function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.querySelector(".lp-hero .lp-btn");
    const contact = document.getElementById("contacto");
    if (!hero || !contact) return;
    let heroSeen = true;
    let contactSeen = false;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroSeen = e.isIntersecting;
        else contactSeen = e.isIntersecting;
      }
      setShow(!heroSeen && !contactSeen);
    });
    io.observe(hero);
    io.observe(contact);
    return () => io.disconnect();
  }, []);

  return (
    <div className={show ? "lp-sticky lp-show" : "lp-sticky"} aria-hidden={!show}>
      <a href="#contacto" className="lp-btn" tabIndex={show ? 0 : -1}>
        Quiero acceso anticipado {ARROW}
      </a>
    </div>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Mismo mínimo que la API, contado como ella: con los espacios juntados.
const MIN_MESSAGE_LENGTH = 10;

// Lo que falta o está mal en el formulario de contacto, en español.
export function contactProblems({ email, message }: { email: string; message: string }): string[] {
  const problems: string[] = [];
  if (!EMAIL_PATTERN.test(email.trim())) {
    problems.push("Escribe un correo válido.");
  }
  if (message.replace(/\s+/g, " ").trim().length < MIN_MESSAGE_LENGTH) {
    problems.push("Cuéntanos un poco más sobre ti.");
  }
  return problems;
}

export function LandingPage() {
  const [localError, setLocalError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const openedAt = useRef(Date.now());
  const root = useRef<HTMLDivElement>(null);
  const mutation = useMutation({ mutationFn: contactApi.sendContact });
  // Si el envío tarda, casi siempre es la API despertando (Render gratis): se avisa.
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!mutation.isPending) {
      setSlow(false);
      return;
    }
    const id = window.setTimeout(() => setSlow(true), 5000);
    return () => window.clearTimeout(id);
  }, [mutation.isPending]);

  useEffect(() => (root.current ? startPhoneDemos(root.current) : undefined), []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Se valida antes de enviar: así se ve el error enseguida y no se gasta uno
    // de los intentos que el servidor permite por hora.
    const problems = contactProblems({ email, message });
    if (problems.length > 0) {
      setLocalError(problems.join(" "));
      return;
    }
    setLocalError(null);
    mutation.mutate({ email: email.trim(), message, website, elapsedMs: Date.now() - openedAt.current });
  }

  return (
    <div className="landing" ref={root}>
      <header>
        <div className="lp-bar">
          <img src={logo} alt="Cycles" width={103} height={30} />
          <Link to="/login" className="lp-login">
            Inicia sesión
          </Link>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div>
              <RotatingAudience />
              <h1>Tú diseñas el ciclo de entrenamiento. Cycles te cuenta cómo les fue.</h1>
              <p className="lp-tagline">Todos tus atletas en un solo lugar, sin perseguir mensajes.</p>
              <p className="lp-lead">
                Cycles es la plataforma de ciclos de entrenamiento: armas el ciclo, tu atleta lo registra desde el
                celular y tú ves quién necesita tu atención.
              </p>
              <a href="#contacto" className="lp-btn lp-btn-pulse">
                Quiero acceso anticipado {ARROW}
              </a>
            </div>
            <div className="lp-hero-visual">
              <ChainCanvas />
              <HoyDevice />
            </div>
          </div>
        </section>

        <section>
          <div className="lp-wrap lp-split">
            <div className="lp-ring-wrap">
              <CycleRing />
            </div>
            <div>
              <h2>Cada ciclo construye el siguiente</h2>
              <p>Cycles gira alrededor de tu ciclo de entrenamiento, sea micro, meso o macrociclo.</p>
              <ol className="lp-loop">
                <li>
                  <span className="lp-bead">1</span>
                  <div>
                    <h3>Diseñas el ciclo</h3>
                    <p>Armas rutinas y las programas semana a semana. Tu atleta las recibe en su celular.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-bead">2</span>
                  <div>
                    <h3>Tu atleta lo entrena</h3>
                    <p>Registra cada serie y cierra la sesión contándote cómo se sintió.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-bead">3</span>
                  <div>
                    <h3>Ves qué pasó</h3>
                    <p>Cycles te marca quién necesita tu atención: dolor, cargas desajustadas, sesiones sin hacer.</p>
                  </div>
                </li>
                <li>
                  <span className="lp-bead">4</span>
                  <div>
                    <h3>Ajustas y empieza el siguiente</h3>
                    <p>Cambias la carga con datos y el próximo ciclo parte de lo que de verdad pasó.</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className="lp-center">
          <div className="lp-wrap">
            <h2>Lo que cambia en una semana normal</h2>
            <div className="lp-compare">
              <div className="lp-cmp lp-before">
                <h3>Hoy</h3>
                <ul>
                  <li>Le mandas el plan a cada atleta en un Excel.</li>
                  <li>Entrena y te cuenta cómo le fue por WhatsApp, o se le olvida.</li>
                  <li>Te enteras de un problema cuando ya pasó.</li>
                  <li>Un Excel y una conversación por cada atleta.</li>
                </ul>
              </div>
              <div className="lp-cmp lp-after">
                <h3>Con Cycles</h3>
                <ul>
                  <li>Armas el ciclo y tu atleta lo recibe en su celular.</li>
                  <li>Cada serie y cada cierre de sesión quedan registrados.</li>
                  <li>Cycles te marca quién necesita tu atención.</li>
                  <li>Todos tus atletas en un solo lugar.</li>
                </ul>
              </div>
            </div>
            <p className="lp-sign">Nada se pierde entre tú y tus atletas.</p>
          </div>
        </section>

        <section className="lp-center lp-tight">
          <div className="lp-wrap">
            <h2>Qué cambia en tu trabajo</h2>
            <div className="lp-benefits">
              <div className="lp-col">
                <div className="lp-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <h3>Ves qué pasó sin preguntar</h3>
                <p>Series, esfuerzo y notas de cada sesión te llegan solos, sin esperar a que tu atleta se acuerde de contarte.</p>
              </div>
              <div className="lp-col">
                <div className="lp-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" />
                  </svg>
                </div>
                <h3>Sabes a quién mirar primero</h3>
                <p>Cycles te avisa si alguien reportó dolor, si una carga se pasó o quedó corta, o si dejó de entrenar.</p>
              </div>
              <div className="lp-col">
                <div className="lp-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
                    <circle cx="16" cy="7" r="2" />
                    <circle cx="8" cy="17" r="2" />
                  </svg>
                </div>
                <h3>Ajustas el ciclo con datos</h3>
                <p>Cuando una carga no calza, Cycles te propone cuánto cambiar en el ciclo. Tú decides si lo aplicas.</p>
              </div>
              <div className="lp-col">
                <div className="lp-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                </div>
                <h3>Recuperas tiempo</h3>
                <p>Se acabó el Excel y el chat por cada atleta. Todos están en un solo lugar.</p>
              </div>
            </div>
            <p className="lp-after-benefits">No cambia cómo entrenas. Tú sigues diseñando el plan.</p>
          </div>
        </section>

        <section className="lp-center lp-tight">
          <div className="lp-wrap">
            <h2>Tu atleta lo registra en el celular</h2>
            <p>Abre la app, hace su rutina serie por serie y cierra la sesión contándote cómo le fue.</p>
            <div className="lp-phones">
              <figure>
                <HoyDevice />
                <figcaption>
                  <span className="lp-stepn">1</span>Su sesión de hoy
                </figcaption>
              </figure>
              <figure>
                <SerieDevice />
                <figcaption>
                  <span className="lp-stepn">2</span>Serie por serie
                </figcaption>
              </figure>
              <figure>
                <CierreDevice />
                <figcaption>
                  <span className="lp-stepn">3</span>Cuéntale a tu coach
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="lp-center lp-tight">
          <div className="lp-wrap">
            <h2>Todos tus atletas, en un solo lugar</h2>
            <p>Abres Cycles y ves quién necesita tu atención, sin un Excel ni un chat por cada atleta.</p>
            <div className="lp-shots">
              <figure className="lp-fig">
                <div className="lp-browser">
                  <div className="lp-browser-top"><i /><i /><i /></div>
                  <picture>
                    <source media="(max-width: 820px)" srcSet={mAtencion} />
                    <img src={atencion} alt="Inicio del coach con la lista Necesitan atención" />
                  </picture>
                </div>
                <figcaption>Inicio: quién necesita tu atención</figcaption>
              </figure>
              <figure className="lp-fig">
                <div className="lp-browser">
                  <div className="lp-browser-top"><i /><i /><i /></div>
                  <picture>
                    <source media="(max-width: 820px)" srcSet={mResumen} />
                    <img src={resumen} alt="Resumen de un atleta con carga semanal y adherencia" />
                  </picture>
                </div>
                <figcaption>Un atleta: carga semanal y adherencia</figcaption>
              </figure>
            </div>
            <p className="lp-after-shots">
              <a href="#contacto" className="lp-btn lp-btn-pulse">
                Quiero acceso anticipado {ARROW}
              </a>
            </p>
          </div>
        </section>

        <section>
          <div className="lp-wrap lp-split lp-reverse">
            <div>
              <h2>Una sesión que no se pudo hacer también cuenta</h2>
              <p>
                Un día no se pudo. Pasa. En Cycles eso queda registrado, con su nota, y no se convierte en un
                fracaso: es un dato más para decidir cómo sigue el ciclo.
              </p>
            </div>
            <div className="lp-browser">
              <div className="lp-browser-top"><i /><i /><i /></div>
              <picture>
                    <source media="(max-width: 820px)" srcSet={mPlan} />
                    <img src={plan} alt="Plan con una sesión omitida y su nota" />
                  </picture>
            </div>
          </div>
        </section>

        <section className="lp-contact" id="contacto">
          <ChainCanvas />
          <div className="lp-wrap lp-center">
            <div className="lp-card">
              <h2>Acceso anticipado, gratis mientras lo construimos</h2>
              <p className="lp-card-lead">
                Estamos armando Cycles junto a los primeros coaches. Déjanos tu correo y cuéntanos cómo trabajas: te
                damos acceso y tu experiencia nos ayuda a decidir qué sigue.
              </p>

              {mutation.isSuccess ? (
                <div className="lp-sent" role="status">
                  Recibido. Te escribiremos al correo que dejaste.
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  {(localError || mutation.isError) && (
                    <div className="error-banner" role="alert">
                      {localError ?? mutation.error?.message}
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="contact-email">Correo</label>
                    <input
                      id="contact-email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="contact-message">Cuéntanos quién eres y cuántos atletas llevas</label>
                    <textarea
                      id="contact-message"
                      required
                      rows={4}
                      maxLength={600}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  {/* Señuelo contra bots: oculto para personas y lectores de pantalla. */}
                  <div className="lp-trap" aria-hidden="true">
                    <label htmlFor="contact-website">Sitio web</label>
                    <input
                      id="contact-website"
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="lp-btn" disabled={mutation.isPending}>
                    {mutation.isPending ? "Enviando…" : <>Quiero acceso anticipado {ARROW}</>}
                  </button>
                  {slow && (
                    <p className="lp-privacy" role="status">
                      El servidor estaba dormido y se está despertando. Puede tardar hasta un minuto: no cierres la página.
                    </p>
                  )}
                  <p className="lp-privacy">Usaremos tu correo solo para responderte.</p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <StickyCta />

      <footer>
        <div className="lp-foot">
          <span>
            <img src="/email/isotipo-cycles.png" alt="" width={16} height={16} />
            Hecho por InProgress Co.
          </span>
          <Link to="/login">Inicia sesión</Link>
        </div>
      </footer>
    </div>
  );
}
