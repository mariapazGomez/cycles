import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

interface Props {
  size?: number;
  color?: string;
}

// Anillo del isotipo girando: la carga de la marca. Mismo trazo que el logo
// (dos arcos con extremos redondeados).
export function Spinner({ size = 24, color = colors.brand }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Path d="M17.09 69 A38 38 0 0 1 61.74 13.86" stroke={color} strokeWidth={20} strokeLinecap="round" />
        <Path d="M81.5 28.75 A38 38 0 0 1 35.77 85.23" stroke={color} strokeWidth={20} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}
