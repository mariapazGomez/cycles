import { useQuery } from "@tanstack/react-query";
import * as cyclesApi from "../services/cyclesApi";
import { AthleteCycleList } from "../components/AthleteCycleList";

// «Mis ciclos» del atleta. El coach ya no tiene esta pestaña: sus ciclos viven
// en la Biblioteca (ver BibliotecaPage y el redirect en App.tsx).
export function CyclesPage() {
  const cyclesQuery = useQuery({ queryKey: ["cycles"], queryFn: cyclesApi.listCycles });

  return (
    <div>
      <h1 className="page-title">Mis ciclos</h1>

      <div style={{ marginTop: 32 }}>
        {cyclesQuery.isLoading && <p>Cargando…</p>}
        {cyclesQuery.isError && <div className="error-banner">No se pudo cargar la lista.</div>}
        {cyclesQuery.data && cyclesQuery.data.length === 0 && (
          <p>Todavía no tienes ciclos. Cuando tu coach te asigne uno, aparecerá aquí.</p>
        )}
        {cyclesQuery.data && cyclesQuery.data.length > 0 && <AthleteCycleList cycles={cyclesQuery.data} />}
      </div>
    </div>
  );
}
