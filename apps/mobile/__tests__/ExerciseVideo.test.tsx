import React from 'react';
import { Alert, Linking } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { ExerciseVideoButton, VideoHint, playableUrl, useVideoHint } from '../src/components/ExerciseVideo';
import { hasSeenVideoHint, markVideoHintSeen } from '../src/services/hintStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

let latest: ReturnType<typeof useVideoHint>;
function Probe({ enabled }: { enabled: boolean }) {
  latest = useVideoHint(enabled);
  return null;
}
const mountProbe = async (enabled: boolean) => {
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<Probe enabled={enabled} />);
  });
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

test('solo se ofrecen enlaces https', () => {
  expect(playableUrl('https://youtu.be/abc')).toBe('https://youtu.be/abc');
  expect(playableUrl('http://youtu.be/abc')).toBeNull();
  expect(playableUrl('javascript:alert(1)')).toBeNull();
  expect(playableUrl(null)).toBeNull();
  expect(playableUrl(undefined)).toBeNull();
});

test('la primera vez con video disponible muestra el aviso', async () => {
  await mountProbe(true);
  expect(latest.visible).toBe(true);
});

test('sin video en la pantalla no hay aviso', async () => {
  await mountProbe(false);
  expect(latest.visible).toBe(false);
});

test('al descartarlo no vuelve a salir, ni en otra pantalla', async () => {
  await mountProbe(true);
  await ReactTestRenderer.act(async () => {
    latest.dismiss();
  });
  expect(latest.visible).toBe(false);
  expect(await hasSeenVideoHint()).toBe(true);
  await mountProbe(true);
  expect(latest.visible).toBe(false);
});

test('marcarlo como visto queda guardado', async () => {
  expect(await hasSeenVideoHint()).toBe(false);
  await markVideoHintSeen();
  expect(await hasSeenVideoHint()).toBe(true);
});

test('tocar el botón abre el video y da por visto el aviso', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const onOpen = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ExerciseVideoButton videoUrl="https://youtu.be/abc" exerciseName="Sentadilla" onOpen={onOpen} />);
  });
  const button = tree.root.find(n => n.props.accessibilityLabel === 'Ver ejemplo de Sentadilla' && typeof n.props.onPress === 'function');
  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });
  expect(open).toHaveBeenCalledWith('https://youtu.be/abc');
  expect(onOpen).toHaveBeenCalled();
});

test('si el video no abre, avisa sin romper la pantalla', async () => {
  jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('x'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<ExerciseVideoButton videoUrl="https://youtu.be/abc" exerciseName="Sentadilla" />);
  });
  await ReactTestRenderer.act(async () => {
    await tree.root.find(n => typeof n.props.onPress === 'function').props.onPress();
  });
  expect(alert).toHaveBeenCalledWith('No se pudo abrir el video', expect.any(String));
});

test('el aviso se descarta con «Entendido»', async () => {
  const dismiss = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<VideoHint onDismiss={dismiss} />);
  });
  tree.root.find(n => n.props.accessibilityLabel === 'Entendido' && typeof n.props.onPress === 'function').props.onPress();
  expect(dismiss).toHaveBeenCalled();
});
