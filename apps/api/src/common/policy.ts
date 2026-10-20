import { Equals } from "class-validator";
import { PolicyAcceptanceSource } from "@prisma/client";

// Versión de los Términos de uso y la Política de privacidad que se le muestra
// a quien se registra. Debe coincidir con la que dice el primer párrafo de
// /privacidad y /terminos (apps/web/public). Al cambiar los textos de forma
// importante, súbela: quien aceptó la anterior verá la pantalla de aceptar de
// nuevo (necesita aceptar la versión vigente). T-147.
export const POLICY_VERSION = "1.1";

export const POLICY_ACCEPTANCE_MESSAGE =
  "Debes aceptar los Términos de uso y la Política de privacidad para continuar.";

// La aceptación tiene que ser explícita: la casilla marcada, no un aviso.
export const AcceptPolicy = () => Equals(true, { message: POLICY_ACCEPTANCE_MESSAGE });

// Fila de aceptación de la versión vigente, para crearla junto con la cuenta.
export function policyAcceptanceData(source: PolicyAcceptanceSource) {
  return { version: POLICY_VERSION, source };
}
