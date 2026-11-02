import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { Isotipo } from '../Logo';
import { colors } from '../../theme/colors';

interface Props {
  onDone: () => void;
  reduceMotion: boolean;
}

// Cierre del inicio de sesión: la pantalla de carga sigue encima de la app que
// acaba de abrirse. El anillo da una vuelta y da un pequeño salto, el ciclo se
// completa, y luego crece y se desvanece para dejar ver la app.
export function WelcomeCurtain({ onDone, reduceMotion }: Props) {
  const turn = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const leave = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      onDone();
      return;
    }
    const sequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(turn, { toValue: 1, duration: 650, easing: Easing.bezier(0.65, 0, 0.25, 1), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(pop, { toValue: 1, duration: 325, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(pop, { toValue: 0, duration: 325, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(120),
      Animated.timing(leave, { toValue: 1, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    sequence.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => sequence.stop();
  }, [reduceMotion, onDone, turn, pop, leave]);

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const popScale = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const growScale = leave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });

  return (
    <Animated.View
      pointerEvents="auto"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Entrando a Cycles"
      style={[styles.curtain, { opacity: leave.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <Animated.View style={{ transform: [{ scale: growScale }] }}>
        <Animated.View style={{ transform: [{ rotate }, { scale: popScale }] }}>
          <Isotipo size={84} />
        </Animated.View>
      </Animated.View>
      <Text style={styles.word}>Cycles</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  curtain: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 14, zIndex: 20 },
  word: { fontSize: 22, fontWeight: '800', color: colors.ink },
});
