import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { GuidePanel } from "./tour/GuidePanel";

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
  const { user, logout } = useAuth();
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

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
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
              setGuide(true);
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
