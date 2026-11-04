import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { GuidePanel } from "./tour/GuidePanel";
import * as tourApi from "../services/tourApi";

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu() {
  const { user, logout, refreshCurrentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // «Cómo usar Cycles» de la atleta: vuelve a poner la guía por marcas (CYC-233).
  async function reopenAthleteGuide() {
    await tourApi.setTourStatus("pending");
    await refreshCurrentUser();
  }

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tour="avatar"
      >
        <span className="user-avatar">{getInitials(user?.name)}</span>
      </button>

      {open && (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-info">
            <p className="user-menu-name">{user?.name}</p>
            <p className="user-menu-email">{user?.email}</p>
          </div>
          <Link to="/account" className="user-menu-item" role="menuitem" onClick={() => setOpen(false)}>
            Mi cuenta
          </Link>
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              if (user?.role === "athlete") void reopenAthleteGuide();
              else setGuide(true);
            }}
          >
            Cómo usar Cycles
          </button>
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
      {guide && <GuidePanel onClose={() => setGuide(false)} />}
    </div>
  );
}
