import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

// Largo de trazo mayor que el de cada arco (~92 y ~97): con este desfase el
// arco empieza oculto, sin que el extremo redondeado deje un punto suelto.
const DASH = 100;
const HIDDEN = 110;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  // La sesión ya se resolvió: cuando termina la animación, se puede entrar.
  ready: boolean;
  onFinish: () => void;
}

// Inicio animado de la marca (1,6 s): los dos arcos del anillo se dibujan, el
// anillo da una vuelta y aparece «Cycles». Si la sesión aún carga, el anillo
// sigue girando. Diseño: docs/diseno/personalidad-app/README.md.
export function BrandSplash({ ready, onFinish }: Props) {
  const draw1 = useRef(new Animated.Value(HIDDEN)).current;
  const draw2 = useRef(new Animated.Value(HIDDEN)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const word = useRef(new Animated.Value(0)).current;
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = (reduceMotion: boolean) => {
      if (cancelled) return;
      if (reduceMotion) {
        draw1.setValue(0);
        draw2.setValue(0);
        word.setValue(1);
        setIntroDone(true);
        return;
      }
      const drawTiming = (value: Animated.Value, delay: number) =>
        Animated.timing(value, {
          toValue: 0,
          duration: 550,
          delay,
          easing: Easing.bezier(0.3, 0.7, 0.2, 1),
          useNativeDriver: false,
        });
      Animated.parallel([
        drawTiming(draw1, 0),
        drawTiming(draw2, 180),
        Animated.timing(spin, {
          toValue: 1,
          duration: 900,
          delay: 550,
          easing: Easing.bezier(0.65, 0, 0.25, 1),
          useNativeDriver: true,
        }),
        Animated.timing(word, {
          toValue: 1,
          duration: 450,
          delay: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && !cancelled) setIntroDone(true);
      });
    };
    AccessibilityInfo.isReduceMotionEnabled().then(run, () => run(false));
    return () => {
      cancelled = true;
    };
  }, [draw1, draw2, spin, word]);

  // Terminada la introducción: si la sesión ya está lista, entra; si no, el
  // anillo sigue girando hasta que lo esté.
  useEffect(() => {
    if (!introDone) return;
    if (ready) {
      const timer = setTimeout(onFinish, 150);
      return () => clearTimeout(timer);
    }
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [introDone, ready, onFinish, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.root} accessible accessibilityRole="progressbar" accessibilityLabel="Cargando Cycles">
      <Animated.View style={{ width: 84, height: 84, transform: [{ rotate }] }}>
        <Svg width={84} height={84} viewBox="0 0 100 100" fill="none">
          <AnimatedPath
            d="M17.09 69 A38 38 0 0 1 61.74 13.86"
            stroke={colors.brand}
            strokeWidth={20}
            strokeLinecap="round"
            strokeDasharray={`${DASH} ${DASH}`}
            strokeDashoffset={draw1}
          />
          <AnimatedPath
            d="M81.5 28.75 A38 38 0 0 1 35.77 85.23"
            stroke={colors.brand}
            strokeWidth={20}
            strokeLinecap="round"
            strokeDasharray={`${DASH} ${DASH}`}
            strokeDashoffset={draw2}
          />
        </Svg>
      </Animated.View>
      <Animated.Text
        style={[
          styles.word,
          {
            opacity: word,
            transform: [{ translateY: word.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
          },
        ]}>
        Cycles
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.ink },
  word: { fontSize: 30, fontWeight: '800', color: colors.onBlue, letterSpacing: -0.3 },
});
