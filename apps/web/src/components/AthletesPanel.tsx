import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as athletesApi from "../services/athletesApi";
import { ApiError } from "../services/httpClient";

const STATUS_LABEL: Record<athletesApi.CoachAthleteStatus, string> = {
  pending: "Pendiente",
  active: "Activo",
  inactive: "Inactivo",
};

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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    inviteMutation.mutate({ name, email });
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
                borderBottom: "1px solid #e2e2e5",
              }}
            >
              <span>
                {relation.athlete.name} <span style={{ color: "#6b6b70" }}>({relation.athlete.email})</span>
              </span>
              <span>{STATUS_LABEL[relation.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
