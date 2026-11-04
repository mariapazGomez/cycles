# Reportes de errores de la app con Sentry (CYC-104, CYC-218)

La app del celular envía a Sentry un reporte técnico cuando falla. Qué se envía y cómo se filtra en el código está en `docs/SEGURIDAD.md` (sección de Sentry, PR de CYC-104). Aquí están los **ajustes que se hacen en la cuenta de Sentry** y lo que dice la política de privacidad (versión 1.3).

## Qué dice la política

Sección 2, «Reportes de errores de la app»: tipo de error, parte del programa, versión de la app, modelo del teléfono y sistema operativo; **sin** nombre, correo, contraseña, notas, dolor ni cargas, y sin IP; solo en la app publicada; para encontrar y arreglar fallos; **hasta 30 días**; servidores en la **Unión Europea**. Base legal: interés legítimo en mantener la app segura y funcionando (sección 4). Sentry figura entre los proveedores (sección 6).

**Las frases «no guardamos tu IP» y «Unión Europea» solo son ciertas si se hacen los ajustes de abajo.** No se sube la compilación con Sentry a TestFlight hasta hacerlos.

## Ajustes en Sentry (la usuaria, una sola vez)

1. **Región:** al crear la organización en [sentry.io](https://sentry.io), elegir **Unión Europea (Alemania)** como región de datos. No se puede cambiar después.
2. **Proyecto** `Cycles móvil`, plataforma **React Native**.
3. *Settings → Projects → Cycles móvil → Security & Privacy*:
   - **Prevent Storing of IP Addresses:** activado.
   - **Data Scrubber** y **Use Default Scrubbers:** activados.
   - **Require Data Scrubber:** activado (a nivel de organización).
4. *Settings → Organization → Data Retention:* el plan gratuito guarda **30 días**; no hay que cambiar nada.
5. Dejar **desactivados** el replay de sesiones y la captura de pantallas (el código ya no los envía).
6. Invitar solo a las personas del equipo que necesitan ver los reportes.
7. Copiar el **DSN** del proyecto al gestor de contraseñas (R1) y cargarlo como `SENTRY_DSN` en Xcode Cloud y como secreto de GitHub (lo pide el PR de CYC-104). Nunca al repo, a Linear ni a un chat.

## App Store Connect (la usuaria)

*App Privacy → Data Types → Diagnostics → Crash Data:* **recopilado**, **no vinculado a la identidad**, **no usado para seguimiento**, finalidad **Análisis** o **Funcionalidad de la app**. Debe coincidir con `PrivacyInfo.xcprivacy` de la app.

## Versión de la política

`POLICY_VERSION` pasó a **1.3** (CYC-218): agregar un tercero que recibe datos técnicos es un cambio importante, igual que al sumar PostHog (1.1). Todas las cuentas ven «Antes de seguir» para aceptar la versión vigente y **hay que recargar la demo** (sus aceptaciones son de la 1.2; ver `docs/MANUAL-DEMOS.md`).
