import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, SessionEnded } from "./api";
import { UsersTab } from "./tabs/UsersTab";
import { UsageTab } from "./tabs/UsageTab";
import { EmailsTab } from "./tabs/EmailsTab";
import { LinksTab } from "./tabs/LinksTab";

const TABS = [
  { id: "usuarios", label: "Usuarios" },
  { id: "uso", label: "Uso" },
  { id: "correos", label: "Correos" },
  { id: "enlaces", label: "Enlaces y versiones" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function App() {
  const [email, setEmail] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("usuarios");
  const [announce, setAnnounce] = useState("");
  const endedButton = useRef<HTMLButtonElement>(null);

  const onSessionEnded = useCallback(() => setEnded(true), []);

  useEffect(() => {
    api<{ email: string }>("/admin/session")
      .then((s) => setEmail(s.email))
      .catch((error: Error) => {
        if (error instanceof SessionEnded) setEnded(true);
        else setFatal(error instanceof ApiError ? error.message : "No pudimos abrir el portal.");
      });
  }, []);

  useEffect(() => {
    if (ended) endedButton.current?.focus();
  }, [ended]);

  const selectTab = (id: TabId) => {
    setTab(id);
    setAnnounce(`Pestaña ${TABS.find((t) => t.id === id)!.label}`);
  };

  // Flechas izquierda y derecha entre pestañas.
  const onTabKey = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    selectTab(TABS[next].id);
    document.getElementById(`tab-${TABS[next].id}`)?.focus();
  };

  return (
    <>
      <header className="app-h">
        <b>Cycles</b>
        <span className="tag">Equipo</span>
        <span className="tag env">Producción</span>
        <span className="spacer" />
        {email && <span className="who">Sesión de {email}</span>}
        {/* Cierre de sesión de Cloudflare Access: invalida el token en el navegador. */}
        {email && (
          <a className="btn sm" href="/cdn-cgi/access/logout">
            Cerrar sesión
          </a>
        )}
      </header>
      <main className="pg">
        <h1>Administración</h1>
        {ended ? (
          <div className="banner info" role="status">
            Tu sesión terminó.
            <button ref={endedButton} className="btn p sm" onClick={() => window.location.reload()}>
              Volver a entrar
            </button>
          </div>
        ) : fatal ? (
          <div className="banner err" role="alert">
            {fatal}
            <button className="btn sm" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </div>
        ) : !email ? (
          <div className="card" aria-busy="true">
            <div className="sk" />
            <div className="sk short" />
          </div>
        ) : (
          <>
            <div className="tabs" role="tablist" aria-label="Secciones del portal">
              {TABS.map((t, i) => (
                <button
                  key={t.id}
                  id={`tab-${t.id}`}
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-controls="panel"
                  tabIndex={tab === t.id ? 0 : -1}
                  onClick={() => selectTab(t.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div id="panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
              {tab === "usuarios" && <UsersTab onSessionEnded={onSessionEnded} />}
              {tab === "uso" && <UsageTab onSessionEnded={onSessionEnded} />}
              {tab === "correos" && <EmailsTab onSessionEnded={onSessionEnded} />}
              {tab === "enlaces" && <LinksTab onSessionEnded={onSessionEnded} />}
            </div>
          </>
        )}
        <div className="sr" aria-live="polite">
          {announce}
        </div>
      </main>
    </>
  );
}
