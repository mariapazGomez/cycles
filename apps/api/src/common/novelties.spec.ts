import { CURRENT_NOVELTY_KEYS as shared } from "../../../../packages/shared/src/novelties";
import { CURRENT_NOVELTY_KEYS } from "./novelties";

describe("novedades vigentes", () => {
  it("la copia de la API es la lista de @cycles/shared", () => {
    expect([...CURRENT_NOVELTY_KEYS].sort()).toEqual([...shared].sort());
  });
});
