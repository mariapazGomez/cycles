import { PixelRatio, useWindowDimensions } from 'react-native';
import { viewScale, type ViewScale } from '../utils/viewScale';

// Escala de las vistas según el tamaño de letra del sistema y el ancho de la pantalla (CYC-259).
export function useViewScale(): ViewScale {
  const { width } = useWindowDimensions();
  return viewScale(PixelRatio.getFontScale(), width);
}
