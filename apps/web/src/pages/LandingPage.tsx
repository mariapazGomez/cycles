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
import { CoachShowcase } from "../components/landing/CoachShowcase";
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
            Ya tengo una cuenta
          </Link>
        </div>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div>
              <RotatingAudience />
              <h1>
                Potencia tus ciclos, agiliza tu planificación y <em>mejora la comunicación</em> con cada atleta.
              </h1>
              <p className="lp-lead">
                Cycles es la plataforma de ciclos de entrenamiento para coaches: tú diseñas, tu atleta registra y tú ves
                quién necesita tu atención.
              </p>
              <a href="#contacto" className="lp-btn lp-btn-pulse">
                Quiero acceso anticipado {ARROW}
              </a>
            </div>
            <div className="lp-hero-visual">
              <ChainCanvas />
              <div className="lp-ov">
                <CoachShowcase />
                <div className="lp-ph">
                  <span className="lp-tag">App del atleta</span>
                  <HoyDevice />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-center lp-tight">
          <div className="lp-wrap">
            <h2>Así te ayuda Cycles en cada parte de tu trabajo</h2>
            <div className="lp-pillars">
              <div className="lp-grp lp-g2">Planificación del entrenamiento</div>
              <div className="lp-grp">Seguimiento constante</div>
              <div className="lp-col">
                <div className="lp-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
                  </svg>
                </div>
                <h3>Potencia tus ciclos</h3>
                <ul className="lp-pl">
                  <li>Diseña el ciclo a la medida de cada atleta, sea micro, meso o macrociclo.</li>
                  <li>Ajusta la carga con lo que tu atleta realmente hizo.</li>
                  <li>Acepta o descarta las sugerencias de ajuste: tú decides.</li>
                </ul>
              </div>
              <div className="lp-col">
                <div className="lp-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="13" r="8" />
                    <path d="M12 9v4l3 2M9 2h6" />
                  </svg>
                </div>
                <h3>Agiliza tu planificación</h3>
                <ul className="lp-pl">
                  <li>Arma rutinas con el catálogo de ejercicios y asígnalas desde un solo lugar.</li>
                  <li>Tu atleta las recibe en su celular, sin Excel ni PDF.</li>
                  <li>Mira la cadena de semanas de cada plan de un vistazo.</li>
                </ul>
              </div>
              <div className="lp-col">
                <div className="lp-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z" />
                  </svg>
                </div>
                <h3>Mejora la comunicación</h3>
                <ul className="lp-pl">
                  <li>Tu atleta registra cada serie y te cuenta cómo se sintió.</li>
                  <li>Ves quién necesita tu atención: dolor, carga o sesiones sin hacer.</li>
                  <li>Todo queda en un lugar, sin perseguir mensajes.</li>
                </ul>
              </div>
            </div>
            <p className="lp-after-benefits">No cambia cómo entrenas. Tú sigues diseñando el plan.</p>
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
                    <img src={plan} alt="Plan por semanas con dos sesiones omitidas y la nota de cada una" />
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
                  <p className="lp-privacy">
                    Usaremos tu correo solo para responderte. Más en la <a href="/privacidad">política de privacidad</a>.
                  </p>
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
          <span className="lp-foot-links">
            <a href="/privacidad">Privacidad</a>
            <a href="/terminos">Términos</a>
            <Link to="/login">Ya tengo una cuenta</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
