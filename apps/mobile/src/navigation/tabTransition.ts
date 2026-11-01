import { Dimensions, Easing } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

type Interpolator = NonNullable<BottomTabNavigationOptions['sceneStyleInterpolator']>;
type Spec = NonNullable<BottomTabNavigationOptions['transitionSpec']>;

// Al cambiar de pestaña las pantallas se deslizan una detrás de otra, en la
// dirección del cambio: ir a una pestaña de la derecha entra desde la derecha.
// `progress` vale -1 (pestañas a la izquierda de la activa), 0 (la activa) o 1
// (a la derecha), así que el desplazamiento es una pantalla completa.
export const slideSpec: Spec = {
  animation: 'timing',
  config: { duration: 280, easing: Easing.bezier(0.22, 1, 0.36, 1) },
};

export const slideInterpolator: Interpolator = ({ current }) => {
  const width = Dimensions.get('window').width;
  return {
    sceneStyle: {
      transform: [
        { translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width] }) },
      ],
    },
  };
};
