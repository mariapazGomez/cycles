import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  notificationCopy,
  notificationTime,
  unreadBadge,
  unreadLabel,
  type AppNotification,
  type NotificationIcon,
  type NotificationTarget,
} from "@cycles/shared";
import { useAuth } from "../hooks/useAuth";
import * as notificationsApi from "../services/notificationsApi";

// Campana de avisos de la cabecera. Diseño: docs/diseno/notificaciones/README.md.

const POLL_MS = 60_000;

function pathFor(target: NotificationTarget): string | null {
  switch (target.kind) {
    case "plan":
      return `/cycles/${target.planId}`;
    case "session":
      return `/sessions/${target.sessionId}`;
    case "sessionLog":
      return `/sessions/${target.sessionId}/registro`;
    case "athlete":
      return `/athletes/${target.athleteId}`;
    default:
      return null;
  }
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 9.5a6 6 0 0 1 12 0c0 4.2 1.4 5.6 2 6.5H4c.6-.9 2-2.3 2-6.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EventIcon({ icon }: { icon: Exclude<NotificationIcon, "initials"> }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": true } as const;
  if (icon === "plus") {
    return (
      <svg {...common}>
        <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (icon === "edit") {
    return (
      <svg {...common}>
        <path
          d="M5 19l1-4L16.5 4.5a1.8 1.8 0 0 1 2.5 0l.5.5a1.8 1.8 0 0 1 0 2.5L9 18l-4 1Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="6" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="6.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="17.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.2 11l7.6-3.4M8.2 13l7.6 3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChainBackdrop() {
  return (
    <svg className="notif-chain" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g fill="#3080fc">
        <circle cx="20" cy="150" r="5" opacity=".25" />
        <circle cx="42" cy="132" r="7" opacity=".35" />
        <circle cx="68" cy="118" r="9" opacity=".5" />
        <circle cx="98" cy="112" r="6" opacity=".4" />
        <circle cx="124" cy="120" r="8" opacity=".55" />
        <circle cx="146" cy="138" r="5" opacity=".3" />
        <circle cx="170" cy="150" r="7" opacity=".45" />
        <circle cx="198" cy="146" r="9" opacity=".6" />
        <circle cx="226" cy="130" r="6" opacity=".4" />
        <circle cx="250" cy="112" r="8" opacity=".5" />
        <circle cx="276" cy="100" r="5" opacity=".3" />
        <circle cx="300" cy="96" r="7" opacity=".25" />
      </g>
    </svg>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const { count } = await notificationsApi.unreadNotificationCount();
      setUnread(count);
    } catch {
      // El número es un extra: si falla, se conserva el anterior.
    }
  }, []);

  const loadList = useCallback(async () => {
    setFailed(false);
    try {
      const [list, { count }] = await Promise.all([
        notificationsApi.listNotifications(),
        notificationsApi.unreadNotificationCount(),
      ]);
      setItems(list);
      setUnread(count);
    } catch {
      setFailed(true);
    }
  }, []);

  // El número se actualiza al abrir la pestaña y cada 60 s mientras esté visible.
  useEffect(() => {
    void refreshCount();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshCount();
    }, POLL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") void refreshCount();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      setItems(null);
      void loadList();
    }
    setOpen((value) => !value);
  }

  async function openNotification(item: AppNotification) {
    const path = pathFor(notificationCopy(item).target);
    setOpen(false);
    if (!item.read) {
      setItems((list) => list?.map((n) => (n.id === item.id ? { ...n, read: true } : n)) ?? list);
      setUnread((count) => Math.max(0, count - 1));
      try {
        await notificationsApi.markNotificationRead(item.id);
      } catch {
        void refreshCount();
      }
    }
    if (path) navigate(path);
  }

  async function markAll() {
    setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? list);
    setUnread(0);
    try {
      await notificationsApi.markAllNotificationsRead();
    } catch {
      void loadList();
    }
  }

  const emptyText =
    user?.role === "coach"
      ? "Cuando tus atletas programen o registren una sesión, lo verás aquí."
      : "Cuando tu coach cambie algo en tu ciclo, lo verás aquí.";

  return (
    <div className="notif" ref={containerRef}>
      <button
        type="button"
        className={open ? "notif-bell notif-bell-open" : "notif-bell"}
        onClick={toggle}
        aria-label={unreadLabel(unread)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <BellIcon />
        {unread > 0 && <span className="notif-badge">{unreadBadge(unread)}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Avisos">
          <div className="notif-head">
            <h2>Avisos</h2>
            {unread > 0 && (
              <button type="button" className="notif-link" onClick={markAll}>
                Marcar todo como leído
              </button>
            )}
          </div>

          {failed && (
            <div className="notif-state">
              <h3>No pudimos cargar tus avisos.</h3>
              <p>Revisa tu conexión e inténtalo de nuevo.</p>
              <button type="button" className="notif-retry" onClick={() => void loadList()}>
                Reintentar
              </button>
            </div>
          )}

          {!failed && items === null && (
            <ul className="notif-list" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="notif-item notif-skeleton">
                  <span className="notif-bead" />
                  <span className="notif-lines">
                    <span />
                    <span />
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!failed && items !== null && items.length === 0 && (
            <div className="notif-state">
              <ChainBackdrop />
              <h3>Todo al día.</h3>
              <p>{emptyText}</p>
            </div>
          )}

          {!failed && items !== null && items.length > 0 && (
            <ul className="notif-list">
              {items.map((item) => {
                const copy = notificationCopy(item);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={item.read ? "notif-item notif-read" : "notif-item notif-unread"}
                      onClick={() => void openNotification(item)}
                    >
                      <span className="notif-bead">
                        {copy.icon === "initials" ? <b>{copy.initials}</b> : <EventIcon icon={copy.icon} />}
                      </span>
                      <span className="notif-body">
                        <span className="notif-title">{copy.title}</span>
                        <span className="notif-text">{copy.text}</span>
                      </span>
                      <span className="notif-when">{notificationTime(item.at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
