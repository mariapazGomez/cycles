import { Platform, type ViewStyle } from 'react-native';
import { colors } from './colors';

// Sombra suave y única de la app móvil: da profundidad a las tarjetas sobre
// el fondo gris sin recurrir a bordes pesados.
export const cardShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  default: { elevation: 3 },
})!;

export const primaryShadow: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: colors.blue,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  default: { elevation: 4 },
})!;
