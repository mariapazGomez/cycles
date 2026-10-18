// Early adopters: el registro está cerrado salvo que VITE_REGISTRATION_OPEN=true
// (junto con REGISTRATION_OPEN=true en la API, que es la que lo hace cumplir).
export const REGISTRATION_OPEN = import.meta.env.VITE_REGISTRATION_OPEN === "true";
