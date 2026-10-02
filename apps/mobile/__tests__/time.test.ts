import { formatClock } from '../src/utils/time';

test('formatClock da formato m:ss', () => {
  expect(formatClock(65)).toBe('1:05');
  expect(formatClock(90)).toBe('1:30');
  expect(formatClock(0)).toBe('0:00');
  expect(formatClock(-3)).toBe('0:00');
});
