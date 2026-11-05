import { bandPath, formatDelta, linePath, niceRange, scaleLinear, xPositions } from '../src/utils/chartMath';

test('niceRange incluye todos los valores con pasos redondos', () => {
  const r = niceRange([60, 62.5, 70, 72.5]);
  expect(r.min).toBeLessThanOrEqual(60);
  expect(r.max).toBeGreaterThanOrEqual(72.5);
  expect((r.max - r.min) % r.step).toBeCloseTo(0);
});

test('niceRange con todos los valores iguales no se aplana', () => {
  const r = niceRange([50, 50]);
  expect(r.max).toBeGreaterThan(r.min);
});

test('scaleLinear mapea el dominio al rango (Y invertido)', () => {
  const y = scaleLinear([0, 100], [200, 0]);
  expect(y(0)).toBe(200);
  expect(y(100)).toBe(0);
  expect(y(50)).toBe(100);
  expect(scaleLinear([5, 5], [0, 10])(5)).toBe(0);
});

test('xPositions reparte parejo y centra un solo punto', () => {
  expect(xPositions(3, 0, 100)).toEqual([0, 50, 100]);
  expect(xPositions(1, 0, 100)).toEqual([50]);
});

test('linePath y bandPath arman el trazado', () => {
  const a = [{ x: 0, y: 0 }, { x: 10, y: 5 }];
  const b = [{ x: 0, y: 4 }, { x: 10, y: 9 }];
  expect(linePath(a)).toBe('M0.0 0.0 L10.0 5.0');
  expect(bandPath(a, b)).toBe('M0.0 0.0 L10.0 5.0 L10.0 9.0 L0.0 4.0 Z');
  expect(bandPath([], [])).toBe('');
});

test('formatDelta usa coma, signo menos tipográfico y cero sin signo', () => {
  expect(formatDelta(-2.5, 'kg')).toBe('−2,5 kg');
  expect(formatDelta(10, 'kg')).toBe('+10 kg');
  expect(formatDelta(0.01, 'kg')).toBe('0 kg');
});
