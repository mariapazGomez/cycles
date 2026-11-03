import type { TourStatus } from '@cycles/shared';
import { apiRequest } from './httpClient';

// Una sola marca por cuenta, compartida con la web (PRD-Onboarding §11.1).
// `pending` sirve para «Cómo usar Cycles» (volver a ver la guía).
export function updateTourStatus(status: TourStatus) {
  return apiRequest<void>('/users/me/tour', { method: 'PATCH', body: { status } });
}
