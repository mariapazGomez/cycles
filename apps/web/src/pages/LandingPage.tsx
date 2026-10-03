import { FormEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import logo from "../assets/logo-cycles.png";
import atencion from "../assets/landing/atencion.jpg";
import resumen from "../assets/landing/resumen.jpg";
import plan from "../assets/landing/plan.jpg";
import { PATTERNS } from "../assets/patterns";
import { CierreDevice, HoyDevice, SerieDevice } from "../components/landing/PhoneScreens";
import * as contactApi from "../services/contactApi";

// Landing para coaches (textos en docs/brand/landing.md; diseño aprobado el
// 2026-10-03). Es lo que ve quien entra a "/" sin sesión. Estructura al estilo
// de myfitnesspal.com con la marca de Cycles. El llamado a la acción es conversar
// con la fundadora, no registrarse: el formulario escribe en POST /contact.
// Las capturas web son de una base de demostración con personas ficticias
// (apps/api/scripts/seed-demo.ts); las pantallas del teléfono son maquetas.

const ARROW = (
  <svg className="lp-arrow" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export function LandingPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const openedAt = useRef(Date.now());
  const mutation = useMutation({ mutationFn: contactApi.sendContact });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ email, message, website, elapsedMs: Date.now() - openedAt.current });
  }

  return (
    <div className="landing">
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
              <h1>Nada se pierde entre tú y tu coach.</h1>
              <p className="lp-tagline">Todos tus atletas, en un solo lugar.</p>
              <p className="lp-lead">
                Si eres coach, Cycles te trae de vuelta lo que pasó en cada sesión, sin que tengas que estar ahí.
              </p>
              <a href="#contacto" className="lp-btn lp-btn-pulse">
                Conversemos {ARROW}
              </a>
            </div>
            <div className="lp-hero-visual" style={{ backgroundImage: `url(${PATTERNS.a})` }}>
              <HoyDevice />
            </div>
          </div>
        </section>

        <section>
          <div className="lp-wrap lp-split">
            <div className="lp-pieces" role="img" aria-label="Tres pedazos separados: el plan, la conversación y lo que pasó">
              <div className="lp-piece">
                <b>El plan</b>
                <span>Una hoja de cálculo por atleta</span>
              </div>
              <div className="lp-piece">
                <b>La conversación</b>
                <span>Mensajes sueltos para coordinar</span>
              </div>
              <div className="lp-piece">
                <b>Lo que pasó en la sesión</b>
                <span>Sin registro</span>
              </div>
            </div>
            <div>
              <h2>Seguro conoces esta escena</h2>
              <p>Tú diseñas el plan y se lo mandas a tu atleta en un Excel.</p>
              <p>Tu atleta entrena según cómo se siente ese día.</p>
              <p>Después tiene que acordarse de contártelo, y a veces se le olvida.</p>
              <p>Lo demás se resuelve por WhatsApp.</p>
              <p>Lo que de verdad pasó en la sesión no queda guardado en ninguna parte.</p>
              <p className="lp-strong">Y eso, por cada atleta que llevas.</p>
            </div>
          </div>
        </section>

        <section className="lp-center">
          <div className="lp-wrap">
            <h2>Cycles junta los pedazos</h2>
            <p>
              El entrenamiento no está mal. Está repartido: el plan en un lugar, la conversación en otro y lo que de
              verdad ocurrió, en ninguno.
            </p>
            <div className="lp-cols">
              <div className="lp-col">
                <div className="lp-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
                    <path d="M3.5 9.5h17M8.5 4.5v-2M15.5 4.5v-2M8 14h3M13 14h3" />
                  </svg>
                </div>
                <h3>Armas el ciclo de entrenamiento</h3>
                <p>Diseñas rutinas y las programas semana a semana, en micro, meso o macrociclos. Tu atleta las recibe.</p>
              </div>
              <div className="lp-col">
                <div className="lp-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
                    <path d="M10.5 18.5h3M9.5 8.5l2 2 3.5-4" />
                  </svg>
                </div>
                <h3>Tu atleta cuenta cómo le fue</h3>
                <p>En el celular, serie por serie, sin acordarse de nada después.</p>
              </div>
              <div className="lp-col">
                <div className="lp-ico">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="8.5" cy="8.5" r="3" />
                    <circle cx="16.5" cy="9.5" r="2.5" />
                    <path d="M3 19c.6-3 2.8-4.6 5.5-4.6S13.4 16 14 19M14.5 14.6c2.4-.5 4.8.8 5.5 4" />
                  </svg>
                </div>
                <h3>Tú lo ves</h3>
                <p>Lo que hizo, cómo se sintió y qué no pudo hacer, de todos tus atletas en un solo lugar.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-center lp-tight">
          <div className="lp-wrap">
            <h2>Tu atleta lo registra en el celular</h2>
            <p>Abre la app, hace su rutina serie por serie y cierra la sesión contándote cómo le fue.</p>
            <div className="lp-phones">
              <figure>
                <HoyDevice />
                <figcaption>Su sesión de hoy</figcaption>
              </figure>
              <figure>
                <SerieDevice />
                <figcaption>Serie por serie</figcaption>
              </figure>
              <figure>
                <CierreDevice />
                <figcaption>Cuéntale a tu coach</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="lp-center lp-tight">
          <div className="lp-wrap">
            <h2>Todos tus atletas, en un solo lugar</h2>
            <p>Sin un Excel y un chat por cada uno. Abres Cycles y ves quién necesita tu atención.</p>
            <div className="lp-shots">
              <div className="lp-browser">
                <div className="lp-browser-top"><i /><i /><i /></div>
                <img src={atencion} alt="Inicio del coach con la lista Necesitan atención" />
              </div>
              <div className="lp-browser">
                <div className="lp-browser-top"><i /><i /><i /></div>
                <img src={resumen} alt="Resumen de un atleta con carga semanal y adherencia" />
              </div>
            </div>
            <p className="lp-after-shots">
              <a href="#contacto" className="lp-btn lp-btn-pulse">
                Conversemos {ARROW}
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
              <p className="lp-strong">Cada ciclo construye el siguiente.</p>
            </div>
            <div className="lp-browser">
              <div className="lp-browser-top"><i /><i /><i /></div>
              <img src={plan} alt="Plan con una sesión omitida y su nota" />
            </div>
          </div>
        </section>

        <section className="lp-contact" id="contacto" style={{ backgroundImage: `url(${PATTERNS.a})` }}>
          <div className="lp-wrap lp-center">
            <div className="lp-card">
              <h2>Todavía lo estamos construyendo</h2>
              <p className="lp-card-lead">
                Queremos hacerlo junto a coaches. Más que venderte algo, queremos conversar contigo sobre cómo
                trabajas hoy: qué te sobra y qué te falta.
              </p>

              {mutation.isSuccess ? (
                <div className="lp-ok" role="status">
                  Recibido. Te escribiremos al correo que dejaste.
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  {mutation.isError && (
                    <div className="error-banner" role="alert">
                      {mutation.error.message}
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
                    <label htmlFor="contact-message">Cuéntanos quién eres</label>
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
                    {mutation.isPending ? "Enviando…" : <>Conversemos {ARROW}</>}
                  </button>
                  <p className="lp-privacy">Usaremos tu correo solo para responderte.</p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

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
