import { Text, TextInput } from 'react-native';
import { FONT_SCALE_MAX } from '../utils/viewScale';

type WithDefaults = { defaultProps?: { maxFontSizeMultiplier?: number } };

// Tope de la letra del sistema para TODO el texto de la app: ×2 (diseño vistas-app). Más allá
// el texto se sale de sus tarjetas. Se llama una vez al arrancar; un texto puede pedir otro
// tope con su propia propiedad `maxFontSizeMultiplier`.
export function applyFontScaleLimit() {
  [Text, TextInput].forEach(component => {
    const target = component as unknown as WithDefaults;
    target.defaultProps = { ...target.defaultProps, maxFontSizeMultiplier: FONT_SCALE_MAX };
  });
}
