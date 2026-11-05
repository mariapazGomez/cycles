import { fetchExerciseProgress } from '../src/services/planApi';
import { apiRequest } from '../src/services/httpClient';
import { summarizeExercises } from '../src/utils/exerciseProgress';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { exerciseProgressFixture } = require('../../../packages/shared/src/fixtures/exerciseProgress');

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

test('contrato con la API: la respuesta de ejemplo fijada por la API se lee y se resume sin errores (CYC-249)', async () => {
  api.mockResolvedValue(exerciseProgressFixture);
  const list = await fetchExerciseProgress();
  expect(list).toHaveLength(1);
  const [summary] = summarizeExercises(list);
  expect(summary).toMatchObject({ name: 'Sentadilla', firstWeight: 60, lastWeight: 65, weightDelta: 5, firstReps: 6, lastReps: 5.5 });
});
