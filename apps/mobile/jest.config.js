module.exports = {
  preset: '@react-native/jest-preset',
  // La primera pantalla pesada de cada archivo compila en frío; en los runners
  // de GitHub (más lentos que un Mac) pasaba de los 5 s por defecto.
  testTimeout: 30000,
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Estos paquetes se publican como ESM y Jest, por defecto, no transforma
  // node_modules: hay que decirle cuáles sí (además de los de React Native).
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|react-native-keychain|@react-native-async-storage)/)',
  ],
};
