// Aviso de una sola vez (CYC-275, paso 2): crear y editar rutinas ahora abre el cajón
// sobre la Biblioteca en vez de una página aparte. Se recuerda en este navegador; la
// mini-guía de novedades (paso 4) lo reemplaza con un registro por cuenta.
const KEY = "cycles.aviso.rutinas-en-cajon";

type Store = Pick<Storage, "getItem" | "setItem">;

function defaultStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function shouldShowMovedNotice(store: Store | null = defaultStore()): boolean {
  try {
    return store ? store.getItem(KEY) === null : true;
  } catch {
    return true;
  }
}

export function dismissMovedNotice(store: Store | null = defaultStore()): void {
  try {
    store?.setItem(KEY, "1");
  } catch {
    // Sin almacenamiento (modo privado): el aviso puede volver a aparecer, sin más.
  }
}
