import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme/colors';
import type { LoginMetrics } from './layout';

// Largo de trazo mayor que el de cada arco: el arco empieza oculto sin dejar un
// punto suelto del extremo redondeado (igual que BrandSplash).
const DASH = 100;
const HIDDEN = 110;
const WORD = 'Cycles'.split('');
// Cuentas de la cadena de la marca que salen del anillo y suben.
const DOTS = [
  { x: 0.18, y: 0.34, r: 7 },
  { x: 0.3, y: 0.22, r: 5 },
  { x: 0.44, y: 0.16, r: 8 },
  { x: 0.62, y: 0.2, r: 5 },
  { x: 0.78, y: 0.3, r: 7 },
  { x: 0.88, y: 0.46, r: 5 },
  { x: 0.1, y: 0.52, r: 5 },
  { x: 0.52, y: 0.4, r: 4 },
];

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  metrics: LoginMetrics;
  width: number;
  // Con el teclado abierto el logo se encoge para dejar sitio al formulario.
  compact: boolean;
  reduceMotion: boolean;
  topInset: number;
}

// Encabezado de la entrada: el anillo se dibuja y da una vuelta, una onda se
// expande, las letras de «Cycles» suben una a una y unas cuentas de la cadena
// flotan hacia arriba. Después el anillo respira. Diseño: propuesta A del
// inicio de sesión (docs/diseno/login-social-ios/README.md, estética).
export function LoginHero({ metrics, width, compact, reduceMotion, topInset }: Props) {
  const draw1 = useRef(new Animated.Value(reduceMotion ? 0 : HIDDEN)).current;
  const draw2 = useRef(new Animated.Value(reduceMotion ? 0 : HIDDEN)).current;
  const turn = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const letters = useRef(WORD.map(() => new Animated.Value(reduceMotion ? 1 : 0))).current;
  const dots = useRef(DOTS.map(() => new Animated.Value(reduceMotion ? 1 : 0))).current;
  const shrink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      draw1.setValue(0);
      draw2.setValue(0);
      turn.setValue(1);
      halo.setValue(1);
      letters.forEach(v => v.setValue(1));
      dots.forEach(v => v.setValue(1));
      return;
    }
    const drawTiming = (value: Animated.Value, delay: number) =>
      Animated.timing(value, {
        toValue: 0,
        duration: 600,
        delay,
        easing: Easing.bezier(0.3, 0.7, 0.2, 1),
        useNativeDriver: false,
      });
    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const intro = Animated.parallel([
      drawTiming(draw1, 100),
      drawTiming(draw2, 280),
      Animated.timing(turn, {
        toValue: 1,
        duration: 900,
        delay: 650,
        easing: Easing.bezier(0.65, 0, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(halo, {
        toValue: 1,
        duration: 1400,
        delay: 900,
        easing: Easing.bezier(0.2, 0.8, 0.3, 1),
        useNativeDriver: true,
      }),
      // Las letras y las cuentas esperan a que el anillo ya se haya dibujado.
      Animated.sequence([
        Animated.delay(1000),
        Animated.stagger(
          55,
          letters.map(v =>
            Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.bezier(0.2, 0.9, 0.25, 1), useNativeDriver: true }),
          ),
        ),
      ]),
      Animated.sequence([
        Animated.delay(900),
        Animated.stagger(
          70,
          dots.map(v => Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true })),
        ),
      ]),
    ]);
    intro.start(({ finished }) => {
      if (finished) breath.start();
    });
    return () => {
      intro.stop();
      breath.stop();
    };
  }, [reduceMotion, draw1, draw2, turn, halo, letters, dots, breathe]);

  useEffect(() => {
    Animated.timing(shrink, {
      toValue: compact ? 1 : 0,
      duration: reduceMotion ? 0 : 320,
      easing: Easing.bezier(0.2, 0.9, 0.25, 1),
      useNativeDriver: false,
    }).start();
  }, [compact, reduceMotion, shrink]);

  const height = shrink.interpolate({ inputRange: [0, 1], outputRange: [metrics.heroHeight, metrics.heroCompactHeight] });
  const ring = shrink.interpolate({ inputRange: [0, 1], outputRange: [metrics.ringSize, metrics.ringCompactSize] });
  const haloSize = metrics.ringSize * 3;
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const dotsOpacity = shrink.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const dotNodes = useMemo(
    () =>
      DOTS.map((dot, i) => ({
        ...dot,
        opacity: dots[i].interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.7, 0.18] }),
        scale: dots[i].interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
        lift: dots[i].interpolate({ inputRange: [0, 1], outputRange: [0, -12] }),
      })),
    [dots],
  );

  return (
    <Animated.View style={[styles.hero, { height, paddingTop: topInset / 2 }]} accessible accessibilityRole="image" accessibilityLabel="Cycles">
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: dotsOpacity }]}>
        {dotNodes.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                left: dot.x * width,
                top: dot.y * metrics.heroHeight,
                width: dot.r,
                height: dot.r,
                borderRadius: dot.r / 2,
                opacity: dot.opacity,
                transform: [{ translateY: dot.lift }, { scale: dot.scale }],
              },
            ]}
          />
        ))}
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: haloSize,
            height: haloSize,
            borderRadius: haloSize / 2,
            opacity: halo.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] }),
            transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.15] }) }],
          },
        ]}
      />

      <Animated.View style={{ width: ring, height: ring }}>
        <Animated.View style={[styles.fill, { transform: [{ rotate }, { scale: breatheScale }] }]}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
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
      </Animated.View>

      <View style={styles.word}>
        {WORD.map((letter, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.letter,
              {
                fontSize: metrics.wordSize,
                opacity: letters[i],
                transform: [{ translateY: letters[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
              },
            ]}>
            {letter}
          </Animated.Text>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'visible' },
  fill: { flex: 1 },
  dot: { position: 'absolute', backgroundColor: colors.brand },
  halo: { position: 'absolute', borderWidth: 2, borderColor: colors.brand },
  word: { flexDirection: 'row' },
  letter: { fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
});
