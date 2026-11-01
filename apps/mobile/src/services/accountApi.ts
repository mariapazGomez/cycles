import { apiRequest } from './httpClient';

// Retira (o vuelve a dar) el consentimiento opcional de estadísticas.
export function setDataConsent(dataConsent: boolean) {
  return apiRequest<void>('/users/me/data-consent', { method: 'PATCH', body: { dataConsent } });
}

// Todos los datos de la persona.
export function exportMyData() {
  return apiRequest<Record<string, unknown>>('/users/me/export');
}

// Elimina la cuenta. `confirmation` debe ser «ELIMINAR».
export function deleteMyAccount(confirmation: string) {
  return apiRequest<void>('/users/me', { method: 'DELETE', body: { confirmation } });
}
