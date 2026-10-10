import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as athletesApi from "../services/athletesApi";
import { ApiError } from "../services/httpClient";

const STATUS_LABEL: Record<athletesApi.CoachAthleteStatus, string> = {
  pending: "Pendiente",
  active: "Activo",
  inactive: "Inactivo",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lo que falta o está mal en el formulario de invitación, en español.
export function inviteProblems({ name, email }: { name: string; email: string }): string[] {
  const problems: string[] = [];
  if (name.trim() === "") {
    problems.push("Escribe el nombre del atleta.");
  }
  if (email.trim() === "") {
    problems.push("Escribe el email del atleta.");
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    problems.push("Revisa el email: debe verse como nombre@correo.com.");
  }
  return problems;
}

export function AthletesPanel() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const athletesQuery = useQuery({
    queryKey: ["athletes"],
    queryFn: athletesApi.listAthletes,
  });

  const inviteMutation = useMutation({
    mutationFn: athletesApi.inviteAthlete,
    onSuccess: () => {
      setName("");
      setEmail("");
      queryClient.invalidateQueries({ queryKey: ["athletes"] });
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : "No se pudo enviar la invitación.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    // Se leen del formulario y no del estado: si el navegador autocompletó un
    // campo sin avisar a la página, el estado seguiría vacío.
    const data = new FormData(event.currentTarget);
    const athlete = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
    };

    // Validación antes de llamar a la API: así se ve el error enseguida y en
    // español, y no se gasta una petición ni se activa el límite de intentos.
    const problems = inviteProblems(athlete);
    if (problems.length > 0) {
      setFormError(problems.join(" "));
      return;
    }
    inviteMutation.mutate(athlete);
  }

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: "1.1rem" }}>Invitar atleta</h2>

      {formError && <div className="error-banner">{formError}</div>}
      {inviteMutation.isSuccess && (
        <div className="success-banner">Invitación enviada a {inviteMutation.variables?.email}.</div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 360 }}>
        <div className="field">
          <label htmlFor="athleteName">Nombre</label>
          <input
            id="athleteName"
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="athleteEmail">Email</label>
          <input
            id="athleteEmail"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="button-primary"
          style={{ width: "auto" }}
          disabled={inviteMutation.isPending}
        >
          {inviteMutation.isPending ? "Enviando…" : "Invitar"}
        </button>
      </form>

      <h2 style={{ fontSize: "1.1rem", marginTop: 32 }}>Mis atletas</h2>

      {athletesQuery.isLoading && <p>Cargando…</p>}
      {athletesQuery.isError && <div className="error-banner">No se pudo cargar la lista.</div>}
      {athletesQuery.data && athletesQuery.data.length === 0 && (
        <p>Todavía no invitaste a ningún atleta.</p>
      )}

      {athletesQuery.data && athletesQuery.data.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, maxWidth: 480 }}>
          {athletesQuery.data.map((relation) => (
            <li
              key={relation.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid var(--color-gray-border)",
              }}
            >
              <span>
                {relation.status === "active" ? (
                  <Link to={`/athletes/${relation.athlete.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>
                    {relation.athlete.name}
                  </Link>
                ) : (
                  relation.athlete.name
                )}{" "}
                <span style={{ color: "var(--color-ink-secondary)" }}>({relation.athlete.email})</span>
              </span>
              <span>{STATUS_LABEL[relation.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
