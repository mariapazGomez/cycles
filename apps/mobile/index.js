/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { initCrashReporting } from './src/services/crashReporting';
import { applyFontScaleLimit } from './src/theme/typography';
import { name as appName } from './app.json';

// Antes de dibujar nada, para registrar también los fallos del arranque.
initCrashReporting();
// Tope de ×2 para la letra del sistema en todo el texto (CYC-259).
applyFontScaleLimit();

AppRegistry.registerComponent(appName, () => App);
