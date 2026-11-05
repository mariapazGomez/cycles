import { fetchExerciseProgress } from '../src/services/planApi';
import { apiRequest } from '../src/services/httpClient';

jest.mock('../src/services/httpClient', () => ({ apiRequest: jest.fn() }));

const api = apiRequest as jest.Mock;
const exercise = { exerciseId: 'e1', name: 'Sentadilla', muscleGroup: null, sessions: [] };

test('desenvuelve la respuesta real de la API: { exercises: [...] } (regresión CYC-241)', async () => {
  api.mockResolvedValue({ exercises: [exercise] });
  await expect(fetchExerciseProgress()).resolves.toEqual([exercise]);
  expect(api).toHaveBeenCalledWith('/me/exercise-progress');
});

test('acepta también una lista suelta', async () => {
  api.mockResolvedValue([exercise]);
  await expect(fetchExerciseProgress()).resolves.toEqual([exercise]);
});

test('una forma inesperada se trata como sin ejercicios, sin lanzar', async () => {
  api.mockResolvedValue({ otraCosa: 1 });
  await expect(fetchExerciseProgress()).resolves.toEqual([]);
  api.mockResolvedValue(null);
  await expect(fetchExerciseProgress()).resolves.toEqual([]);
});
