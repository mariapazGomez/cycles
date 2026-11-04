/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { initCrashReporting } from './src/services/crashReporting';
import { name as appName } from './app.json';

// Antes de dibujar nada, para registrar también los fallos del arranque.
initCrashReporting();

AppRegistry.registerComponent(appName, () => App);
