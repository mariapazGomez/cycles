/* eslint-env jest */
// Los tests corren en Node, sin los módulos nativos de iOS. Estas versiones en
// memoria de AsyncStorage y del Keychain evitan que cargar la app entera rompa
// (AsyncStorage 3 se publica como ESM y Jest no lo transforma). Un test que
// necesite otro comportamiento define su propio jest.mock y tiene prioridad.

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  const storage = {
    getItem: async key => (store.has(key) ? store.get(key) : null),
    setItem: async (key, value) => {
      store.set(key, value);
    },
    removeItem: async key => {
      store.delete(key);
    },
    getMany: async keys => Object.fromEntries(keys.map(key => [key, store.has(key) ? store.get(key) : null])),
    setMany: async entries => {
      Object.entries(entries).forEach(([key, value]) => store.set(key, value));
    },
    removeMany: async keys => {
      keys.forEach(key => store.delete(key));
    },
    getAllKeys: async () => [...store.keys()],
    clear: async () => {
      store.clear();
    },
  };
  return { __esModule: true, default: storage };
});

jest.mock('react-native-keychain', () => {
  let saved = null;
  return {
    ACCESSIBLE: {
      AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock',
      AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly',
    },
    setGenericPassword: jest.fn(async (username, password) => {
      saved = { username, password };
      return { service: 'test', storage: 'test' };
    }),
    getGenericPassword: jest.fn(async () => (saved ? { ...saved, service: 'test', storage: 'test' } : false)),
    resetGenericPassword: jest.fn(async () => {
      saved = null;
      return true;
    }),
  };
});
