import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AssistantScreen } from '../src/screens/AssistantScreen';
import { sendToAssistant } from '../src/services/assistantApi';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, []),
}));
jest.mock('../src/services/planApi', () => ({
  fetchActiveCycles: jest.fn().mockResolvedValue([]),
  fetchCycleSessions: jest.fn().mockResolvedValue([]),
}));
jest.mock('../src/services/assistantApi', () => ({
  ...jest.requireActual('../src/services/assistantApi'),
  sendToAssistant: jest.fn(),
}));

const send = sendToAssistant as jest.Mock;
const texts = (t: ReactTestRenderer.ReactTestRenderer) =>
  t.root.findAllByType(require('react-native').Text).map(n => [n.props.children].flat().join(''));

async function mount() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<AssistantScreen />);
  });
  return tree;
}
async function write(tree: ReactTestRenderer.ReactTestRenderer, text: string) {
  const input = tree.root.findByProps({ accessibilityLabel: 'Mensaje para el asistente' });
  await ReactTestRenderer.act(async () => input.props.onChangeText(text));
  const btn = tree.root.findAll(n => n.props.accessibilityLabel === 'Enviar' && typeof n.props.onPress === 'function')[0];
  await ReactTestRenderer.act(async () => btn.props.onPress());
}

beforeEach(() => send.mockReset());

test('muestra el estado vacío', async () => {
  expect(texts(await mount())).toContain('¿En qué te ayudo?');
});

test('envía el mensaje y muestra la respuesta', async () => {
  send.mockResolvedValue('Hola');
  const tree = await mount();
  await write(tree, 'Buenas');
  const all = texts(tree);
  expect(all).toContain('Buenas');
  expect(all).toContain('Hola');
});

test('si falla ofrece reintentar', async () => {
  send.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce('Ahora sí');
  const tree = await mount();
  await write(tree, 'Buenas');
  expect(texts(tree)).toContain('No pudimos obtener respuesta.');
  const retry = tree.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && n.props.accessibilityLabel !== 'Enviar')[0];
  await ReactTestRenderer.act(async () => retry.props.onPress());
  expect(texts(tree)).toContain('Ahora sí');
});

test('el atajo del ciclo envía la pregunta tal cual', async () => {
  send.mockResolvedValue('ok');
  const tree = await mount();
  const chip = tree.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' && n.findAllByType(require('react-native').Text).some(t => t.props.children === 'Cómo va mi ciclo'))[0];
  await ReactTestRenderer.act(async () => chip.props.onPress());
  expect(send.mock.calls[0][0].at(-1).text).toBe('Cómo va mi ciclo');
});

test('las respuestas simuladas usan los datos del ciclo', async () => {
  const { sendToAssistant: real } = jest.requireActual('../src/services/assistantApi');
  jest.useFakeTimers();
  const p = real([{ id: '1', role: 'user', text: 'Cómo va mi ciclo' }], { name: 'Fuerza', week: 3, weeks: 6, done: 5, total: 12 });
  jest.advanceTimersByTime(1100);
  expect(await p).toContain('semana 3 de 6');
  jest.useRealTimers();
});
