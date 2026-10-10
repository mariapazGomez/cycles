module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Estos paquetes se publican como ESM y Jest, por defecto, no transforma
  // node_modules: hay que decirle cuáles sí (además de los de React Native).
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-safe-area-context|react-native-svg|react-native-keychain|@react-native-async-storage)/)',
  ],
};
