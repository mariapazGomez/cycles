import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import logo from "../assets/logo-cycles.png";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? "app-nav-link app-nav-link-active" : "app-nav-link";
}

export function AppLayout() {
  const { user } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <img className="app-logo" src={logo} alt="Cycles" height={26} />
          {user?.role === "coach" && (
            <nav className="app-nav">
              <NavLink to="/" end className={navLinkClass}>
                Inicio
              </NavLink>
              <NavLink to="/athletes" className={navLinkClass}>
                Atletas
              </NavLink>
              <NavLink to="/cycles" className={navLinkClass}>
                Ciclos
              </NavLink>
              <NavLink to="/routines" className={navLinkClass}>
                Rutinas
              </NavLink>
            </nav>
          )}
          {user?.role === "athlete" && (
            <nav className="app-nav">
              <NavLink to="/" end className={navLinkClass}>
                Hoy
              </NavLink>
              <NavLink to="/calendar" className={navLinkClass}>
                Calendario
              </NavLink>
              <NavLink to="/cycles" className={navLinkClass}>
                Mis ciclos
              </NavLink>
            </nav>
          )}
        </div>
        <div className="app-header-right">
          <NotificationBell />
          <UserMenu />
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
