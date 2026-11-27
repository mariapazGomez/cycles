import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

// Las preguntas son obligatorias, pero sin dejar a nadie encerrado: desde su cuenta puede descargar
// sus datos o eliminarla sin responder, y siempre puede cerrar sesión.
export function CoachExits() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <>
      <Link to="/account">Mi cuenta</Link>
      <button type="button" onClick={() => void logout().then(() => navigate("/login", { replace: true }))}>
        Cerrar sesión
      </button>
    </>
  );
}
