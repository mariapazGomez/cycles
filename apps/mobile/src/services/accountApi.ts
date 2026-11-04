import { apiRequest } from './httpClient';

// Retira (o vuelve a dar) el consentimiento opcional de estadísticas.
export function setDataConsent(dataConsent: boolean) {
  return apiRequest<void>('/users/me/data-consent', { method: 'PATCH', body: { dataConsent } });
}

// Todos los datos de la persona.
export function exportMyData() {
  return apiRequest<Record<string, unknown>>('/users/me/export');
}

// Elimina la cuenta. `confirmation` debe ser «ELIMINAR». Con Apple vinculado,
// `appleAuthorizationCode` permite revocar la autorización de Apple.
export function deleteMyAccount(confirmation: string, appleAuthorizationCode?: string) {
  return apiRequest<void>('/users/me', {
    method: 'DELETE',
    body: appleAuthorizationCode ? { confirmation, appleAuthorizationCode } : { confirmation },
  });
}

// «Vincular Apple»: añade la cuenta de Apple (token de identidad y nonce de la hoja de Apple) a esta cuenta.
export function linkApple(credential: { idToken: string; nonce: string }) {
  return apiRequest<void>('/auth/apple/link', { method: 'POST', body: credential });
}
