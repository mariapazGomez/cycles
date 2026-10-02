import type { TrainingCycle, TrainingSession } from '@cycles/shared';
import { apiRequest } from './httpClient';

export function fetchActiveCycles() {
  return apiRequest<TrainingCycle[]>('/cycles?status=active');
}

export function fetchCycleSessions(cycleId: string) {
  return apiRequest<TrainingSession[]>(`/cycles/${cycleId}/sessions`);
}
