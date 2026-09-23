import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
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
          <span className="app-logo">Cycles</span>
          {user?.role === "coach" && (
            <nav className="app-nav">
              <NavLink to="/athletes" className={navLinkClass}>
                Atletas
              </NavLink>
              <NavLink to="/cycles" className={navLinkClass}>
                Planes
              </NavLink>
            </nav>
          )}
        </div>
        <UserMenu />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
