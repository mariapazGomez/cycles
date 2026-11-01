import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AccountScreen, CONFIRM_WORD } from '../src/screens/AccountScreen';
import * as accountApi from '../src/services/accountApi';
import { ApiError } from '../src/services/httpClient';

const mockLogout = jest.fn();
jest.mock('../src/services/accountApi');
jest.mock('../src/store/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Valentina', email: 'v@example.com', dataConsentAt: null },
    logout: mockLogout,
    refreshUser: jest.fn(),
  }),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/components/Icon', () => ({ Icon: () => null }));

const api = accountApi as jest.Mocked<typeof accountApi>;

async function mount() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    const props = { navigation: { goBack: jest.fn() } } as unknown as React.ComponentProps<typeof AccountScreen>;
    tree = ReactTestRenderer.create(<AccountScreen {...props} />);
  });
  return tree;
}

const deleteButton = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => n.props.accessibilityRole === 'button' && n.props.onPress && n.props.disabled !== undefined).slice(-1)[0];

beforeEach(() => jest.clearAllMocks());

test('eliminar queda bloqueado hasta escribir ELIMINAR', async () => {
  const tree = await mount();
  const input = tree.root.findByProps({ accessibilityLabel: 'Escribe ELIMINAR para confirmar' });
  expect(deleteButton(tree).props.disabled).toBe(true);

  await ReactTestRenderer.act(async () => input.props.onChangeText('eliminar'));
  expect(deleteButton(tree).props.disabled).toBe(true);

  await ReactTestRenderer.act(async () => input.props.onChangeText(CONFIRM_WORD));
  expect(deleteButton(tree).props.disabled).toBe(false);
});

test('al confirmar elimina la cuenta en el servidor y cierra la sesión local', async () => {
  api.deleteMyAccount.mockResolvedValue(undefined);
  const tree = await mount();
  await ReactTestRenderer.act(async () =>
    tree.root.findByProps({ accessibilityLabel: 'Escribe ELIMINAR para confirmar' }).props.onChangeText(CONFIRM_WORD),
  );
  await ReactTestRenderer.act(async () => deleteButton(tree).props.onPress());
  expect(api.deleteMyAccount).toHaveBeenCalledWith('ELIMINAR');
  expect(mockLogout).toHaveBeenCalled();
});

test('si el servidor falla, muestra el error y no cierra la sesión', async () => {
  api.deleteMyAccount.mockRejectedValue(new ApiError(500, 'No pudimos eliminar la cuenta.'));
  const tree = await mount();
  await ReactTestRenderer.act(async () =>
    tree.root.findByProps({ accessibilityLabel: 'Escribe ELIMINAR para confirmar' }).props.onChangeText(CONFIRM_WORD),
  );
  await ReactTestRenderer.act(async () => deleteButton(tree).props.onPress());
  expect(mockLogout).not.toHaveBeenCalled();
  expect(JSON.stringify(tree.toJSON())).toContain('No pudimos eliminar la cuenta.');
});

test('retirar el consentimiento llama al servidor', async () => {
  api.setDataConsent.mockResolvedValue(undefined);
  const tree = await mount();
  const sw = tree.root.findByProps({ accessibilityLabel: 'Permitir el uso de mis datos para estadísticas' });
  await ReactTestRenderer.act(async () => sw.props.onValueChange(true));
  expect(api.setDataConsent).toHaveBeenCalledWith(true);
});
