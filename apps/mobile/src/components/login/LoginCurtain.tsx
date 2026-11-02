import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { Isotipo } from '../Logo';
import { colors } from '../../theme/colors';

interface Props {
  visible: boolean;
  slow: boolean;
  reduceMotion: boolean;
}

// Pantalla de carga con el anillo de Cycles latiendo. Entra con un fundido y
// sale igual si el intento falla. Si el servidor tarda, lo dice.
export function LoginCurtain({ visible, slow, reduceMotion }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: visible ? 1 : 0, duration: reduceMotion ? 0 : 250, useNativeDriver: true }).start();
  }, [visible, reduceMotion, fade]);

  useEffect(() => {
    if (!visible || reduceMotion) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, reduceMotion, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'yes' : 'no-hide-descendants'}
      accessibilityLiveRegion="polite"
      style={[styles.curtain, { opacity: fade }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Isotipo size={84} />
      </Animated.View>
      <Text style={styles.word}>Cycles</Text>
      {slow && <Text style={styles.slow}>El servidor estaba dormido y está despertando. Puede tardar hasta un minuto.</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  curtain: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
    zIndex: 10,
  },
  word: { fontSize: 22, fontWeight: '800', color: colors.ink },
  slow: { color: colors.inkSecondary, fontSize: 13, textAlign: 'center', marginTop: 4 },
});
