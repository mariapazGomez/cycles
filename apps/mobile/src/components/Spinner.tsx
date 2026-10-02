import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

interface Props {
  size?: number;
  color?: string;
}

// Anillo del isotipo girando: la carga de la marca. Mismo trazo que el logo
// (tres arcos con extremos redondeados).
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
        <Path d="M50 12 A38 38 0 0 1 86 40" stroke={color} strokeWidth={20} strokeLinecap="round" transform="rotate(-20 50 50)" />
        <Path d="M80 66 A38 38 0 0 1 24 80" stroke={color} strokeWidth={20} strokeLinecap="round" transform="rotate(-20 50 50)" />
        <Path d="M16 60 A38 38 0 0 1 22 30" stroke={color} strokeWidth={20} strokeLinecap="round" transform="rotate(-20 50 50)" />
      </Svg>
    </Animated.View>
  );
}
