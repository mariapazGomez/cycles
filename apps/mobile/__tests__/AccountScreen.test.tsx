import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AccountScreen, CONFIRM_WORD } from '../src/screens/AccountScreen';
import * as accountApi from '../src/services/accountApi';
import { ApiError } from '../src/services/httpClient';
import * as apple from '../src/services/appleSignIn';

const mockLogout = jest.fn();
let mockUser: Record<string, unknown> = { name: 'Valentina', email: 'v@example.com', dataConsentAt: null };
jest.mock('../src/services/accountApi');
jest.mock('../src/store/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout, refreshUser: jest.fn() }),
}));
jest.mock('../src/services/appleSignIn', () => {
  class AppleSignInCancelled extends Error {}
  return { isAppleSignInAvailable: true, requestAppleAuthorizationCode: jest.fn(), AppleSignInCancelled };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/components/Icon', () => ({ Icon: () => null }));

const api = accountApi as jest.Mocked<typeof accountApi>;
const appleMock = apple as jest.Mocked<typeof apple>;

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

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { name: 'Valentina', email: 'v@example.com', dataConsentAt: null };
});

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
  // Sin Apple vinculado no se pide ni se manda ningún código.
  expect(api.deleteMyAccount).toHaveBeenCalledWith('ELIMINAR', undefined);
  expect(appleMock.requestAppleAuthorizationCode).not.toHaveBeenCalled();
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

describe('cuenta con Apple vinculado', () => {
  const confirmAndDelete = async (tree: ReactTestRenderer.ReactTestRenderer) => {
    await ReactTestRenderer.act(async () =>
      tree.root.findByProps({ accessibilityLabel: 'Escribe ELIMINAR para confirmar' }).props.onChangeText(CONFIRM_WORD),
    );
    await ReactTestRenderer.act(async () => deleteButton(tree).props.onPress());
  };

  beforeEach(() => {
    mockUser = { name: 'Valentina', email: 'v@example.com', dataConsentAt: null, hasAppleIdentity: true };
  });

  test('pide la confirmación a Apple y manda el código para revocar su acceso', async () => {
    appleMock.requestAppleAuthorizationCode.mockResolvedValue('codigo-de-apple');
    api.deleteMyAccount.mockResolvedValue(undefined);
    const tree = await mount();
    await confirmAndDelete(tree);
    expect(api.deleteMyAccount).toHaveBeenCalledWith('ELIMINAR', 'codigo-de-apple');
    expect(mockLogout).toHaveBeenCalled();
  });

  test('avisa en la pantalla que se pedirá confirmar con Apple', async () => {
    const tree = await mount();
    const t = tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);
    expect(t.some(text => text.includes('confirmarlo con Apple'))).toBe(true);
  });

  test('si cierra la hoja de Apple no se elimina nada ni se muestra un error', async () => {
    appleMock.requestAppleAuthorizationCode.mockRejectedValue(new apple.AppleSignInCancelled());
    const tree = await mount();
    await confirmAndDelete(tree);
    expect(api.deleteMyAccount).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
    const t = tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);
    expect(t).not.toContain('Algo salió mal. Intenta de nuevo.');
  });

  test('si Apple falla por otra causa, muestra el error y no elimina', async () => {
    appleMock.requestAppleAuthorizationCode.mockRejectedValue(new Error('Apple no entregó la confirmación. Vuelve a intentarlo.'));
    const tree = await mount();
    await confirmAndDelete(tree);
    expect(api.deleteMyAccount).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  test('si el servidor dice que es otra cuenta de Apple, lo muestra y no cierra la sesión', async () => {
    appleMock.requestAppleAuthorizationCode.mockResolvedValue('codigo-ajeno');
    api.deleteMyAccount.mockRejectedValue(new ApiError(400, 'Confirma con la cuenta de Apple con la que entraste.'));
    const tree = await mount();
    await confirmAndDelete(tree);
    const t = tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);
    expect(t).toContain('Confirma con la cuenta de Apple con la que entraste.');
    expect(mockLogout).not.toHaveBeenCalled();
  });
});
