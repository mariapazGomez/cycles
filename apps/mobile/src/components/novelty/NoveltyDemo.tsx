import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { BLOCK_TYPE_COLOR, type NoveltyDemoId, type NoveltySlide } from '@cycles/shared';
import { Pearl } from '../pearl/Pearl';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { WeekRing } from '../today/WeekRing';
import { viewShadow } from '../../theme/elevation';

// Demostraciones de las novedades de la app, dibujadas en código con el aspecto de la interfaz.
//
// Cada demo tiene UNA línea de tiempo (`t`, de 0 a 1) que corre en el hilo nativo
// (`useNativeDriver`) y solo mueve `opacity` y `transform`: no hay estado de React por fase ni
// por fotograma, así que no se vuelve a dibujar nada mientras se anima. El ciclo termina volviendo
// al inicio con una transición, para que al repetirse no haya saltos. Con «reducir movimiento»
// no se anima: `t` queda en `FINAL`, el RESULTADO FINAL de la demostración, fijo.
const LOOP_MS = 7200;
// Punto de la línea de tiempo en que la demo está en su resultado final (y se queda quieta).
const FINAL = 0.7;

const range = (t: Animated.Value, stops: Array<[number, number]>) =>
  t.interpolate({ inputRange: stops.map(s => s[0]), outputRange: stops.map(s => s[1]), extrapolate: 'clamp' });

// Un tramo de aparición: 0 hasta `a`, sube a 1 en `b`, se mantiene hasta `c` y baja a 0 en `d`.
const pulse = (t: Animated.Value, a: number, b: number, c: number, d: number) =>
  range(t, [
    [0, 0],
    [a, 0],
    [b, 1],
    [c, 1],
    [d, 0],
    [1, 0],
  ]);

function useTimeline(): Animated.Value {
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(FINAL)).current;
  useEffect(() => {
    if (reduce) {
      t.setValue(FINAL);
      return undefined;
    }
    t.setValue(0);
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: LOOP_MS, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduce, t]);
  return t;
}

const ROW_H = 30;
const HEAD_H = 30;
const GAP = 6;
const BLOCKS = [
  { name: 'Calentamiento', glyph: 'warm', color: BLOCK_TYPE_COLOR.warmup, row: 'Movilidad de cadera' },
  { name: 'Pliometría', glyph: 'plyo', color: BLOCK_TYPE_COLOR.plyometrics, row: 'Saltos al cajón' },
  { name: 'Fuerza', glyph: 'weights', color: BLOCK_TYPE_COLOR.strength, row: 'Sentadilla' },
] as const;
const CARD_H = HEAD_H + ROW_H;

function Layer({ style, opacity, translateY, children, testID }: { style?: object; opacity?: Animated.AnimatedInterpolation<number>; translateY?: Animated.AnimatedInterpolation<number>; children?: React.ReactNode; testID?: string }) {
  return (
    <Animated.View testID={testID} style={[style, opacity ? { opacity } : null, translateY ? { transform: [{ translateY }] } : null]}>
      {children}
    </Animated.View>
  );
}

// 1. La lista de ejercicios se ordena en bloques: los ejercicios se deslizan a su lugar y las
// tarjetas de los bloques aparecen alrededor de ellos (no se reemplazan unos por otros).
function GroupDemo() {
  const t = useTimeline();
  const height = BLOCKS.length * CARD_H + (BLOCKS.length - 1) * GAP;
  const cards = range(t, [[0, 0], [0.2, 0], [0.42, 1], [0.85, 1], [0.98, 0], [1, 0]]);
  const move = range(t, [[0, 0], [0.2, 0], [0.42, 1], [0.85, 1], [0.98, 0], [1, 0]]);
  return (
    <View style={{ height }}>
      {BLOCKS.map((b, i) => {
        const top = i * (CARD_H + GAP);
        const flatTop = i * (ROW_H + GAP);
        const groupedTop = top + HEAD_H;
        return (
          <React.Fragment key={b.name}>
            <Layer style={[styles.card, { top, height: CARD_H }]} opacity={cards}>
              <View style={styles.head}>
                <Pearl kind={{ glyph: b.glyph }} color={b.color} size={24} />
                <Text style={styles.headText}>{b.name}</Text>
              </View>
            </Layer>
            <Layer
              style={[styles.row, { top: flatTop }]}
              translateY={move.interpolate({ inputRange: [0, 1], outputRange: [0, groupedTop - flatTop] })}>
              <Text style={styles.rowText}>{b.row}</Text>
            </Layer>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const FOLD_ROWS = ['Sentadilla', 'Peso muerto'];

// 2. Se toca el encabezado de «Fuerza»: sus ejercicios salen de debajo y se esconden de nuevo.
function FoldDemo() {
  const t = useTimeline();
  const open = range(t, [[0, 0], [0.2, 0], [0.38, 1], [0.8, 1], [0.95, 0], [1, 0]]);
  const rotate = open.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });
  const slide = open.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });
  return (
    <View style={{ height: HEAD_H + 14 + FOLD_ROWS.length * ROW_H + 8 + HEAD_H + 14 }}>
      <View style={[styles.card, styles.foldTop]}>
        <View style={[styles.head, styles.headFold]}>
          <Pearl kind={{ glyph: 'warm' }} color={BLOCK_TYPE_COLOR.warmup} size={24} />
          <Text style={styles.headText}>Calentamiento</Text>
          <View style={[styles.badge, styles.badgeDone]}>
            <Text style={[styles.badgeText, styles.badgeTextDone]}>Hecho</Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.inkSecondary} />
        </View>
      </View>
      <View style={[styles.card, { top: HEAD_H + 14 + 8, height: HEAD_H + 14 }]}>
        <View style={[styles.head, styles.headFold]}>
          <Pearl kind={{ glyph: 'weights' }} color={BLOCK_TYPE_COLOR.strength} size={24} />
          <Text style={styles.headText}>Fuerza</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>0 de 2</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Icon name="chevronDown" size={18} color={colors.inkSecondary} />
          </Animated.View>
        </View>
      </View>
      <Layer style={[styles.drawer, { top: (HEAD_H + 14) * 2 + 8 }]} opacity={open} translateY={slide}>
        {FOLD_ROWS.map(r => (
          <View key={r} style={styles.drawerRow}>
            <Text style={styles.rowText}>{r}</Text>
          </View>
        ))}
      </Layer>
    </View>
  );
}

const PROGRESS = ['0 de 2', '1 de 2', 'Hecho'];

// 3. El avance de un bloque: «0 de 2», «1 de 2» y «Hecho» se funden uno en otro.
function ProgressDemo() {
  const t = useTimeline();
  const states = [
    range(t, [[0, 1], [0.2, 1], [0.28, 0], [0.9, 0], [0.98, 1], [1, 1]]),
    pulse(t, 0.2, 0.28, 0.4, 0.48),
    range(t, [[0, 0], [0.4, 0], [0.48, 1], [0.9, 1], [0.98, 0], [1, 0]]),
  ];
  const check = (from: number) => range(t, [[0, 0], [from, 0], [from + 0.08, 1], [0.9, 1], [0.98, 0], [1, 0]]);
  const checks = [check(0.24), check(0.44)];
  return (
    <View style={[styles.card, styles.progressCard]}>
      <View style={[styles.head, styles.headFold]}>
        <Pearl kind={{ glyph: 'weights' }} color={BLOCK_TYPE_COLOR.strength} size={24} />
        <Text style={styles.headText}>Fuerza</Text>
        <View style={styles.progressBox}>
          {PROGRESS.map((label, i) => (
            <Layer key={label} style={[styles.progressLayer]} opacity={states[i]} testID={`progress-${i}`}>
              <View style={[styles.badge, i === 2 && styles.badgeDone]}>
                <Text style={[styles.badgeText, i === 2 && styles.badgeTextDone]}>{label}</Text>
              </View>
            </Layer>
          ))}
        </View>
      </View>
      {FOLD_ROWS.map((r, i) => (
        <View key={r} style={styles.bodyRow}>
          <Text style={styles.rowText}>{r}</Text>
          <Layer opacity={checks[i]}>
            <Icon name="check" size={16} color={colors.okInk} />
          </Layer>
        </View>
      ))}
    </View>
  );
}

const RING_STEPS = [
  { percent: 0, sessions: '0 de 3' },
  { percent: 33, sessions: '1 de 3' },
  { percent: 67, sessions: '2 de 3' },
];
const RING = 76;

// 4. La tarjeta «Esta semana»: el anillo pasa de 0 a 33 y a 67 %, con sus sesiones. Cada estado
// es un anillo ya dibujado; se funden entre sí (el arco de SVG no se anima en el hilo nativo).
function WeeklyRingDemo() {
  const t = useTimeline();
  const states = [
    range(t, [[0, 1], [0.2, 1], [0.28, 0], [0.9, 0], [0.98, 1], [1, 1]]),
    pulse(t, 0.2, 0.28, 0.4, 0.48),
    range(t, [[0, 0], [0.4, 0], [0.48, 1], [0.9, 1], [0.98, 0], [1, 0]]),
  ];
  return (
    <View style={styles.weekCard}>
      <View style={styles.weekHead}>
        <Text style={styles.headText}>Esta semana</Text>
        <Text style={styles.weekRange}>9 al 15 nov</Text>
      </View>
      <View style={styles.weekBody}>
        <View style={styles.weekRing}>
          {RING_STEPS.map((s, i) => (
            <Layer key={s.percent} style={styles.overlay} opacity={states[i]} testID={`ring-${s.percent}`}>
              <WeekRing percent={s.percent} size={RING} />
              <View style={styles.overlay}>
                <Text style={styles.weekPercent}>{`${s.percent}%`}</Text>
              </View>
            </Layer>
          ))}
        </View>
        <View style={styles.weekFigures}>
          <View style={styles.sessionsBox}>
            {RING_STEPS.map((s, i) => (
              <Layer key={s.sessions} style={styles.sessionsLayer} opacity={states[i]}>
                <Text style={styles.weekBig}>{s.sessions}</Text>
              </Layer>
            ))}
          </View>
          <Text style={styles.weekLabel}>sesiones</Text>
        </View>
      </View>
    </View>
  );
}

const FIGURES = [
  { label: 'Sesiones', value: '2 de 3' },
  { label: 'Tiempo entrenado', value: '3 h 20 min' },
  { label: 'Esfuerzo medio', value: '6,5' },
];

// 5. Las tres cifras de la semana: el resalte pasa de una a otra y al final no queda ninguna
// resaltada. El resalte es una capa que se funde (no un borde que cambia de color).
function WeeklyFiguresDemo() {
  const t = useTimeline();
  const on = [
    pulse(t, 0.02, 0.1, 0.22, 0.3),
    pulse(t, 0.22, 0.3, 0.4, 0.48),
    pulse(t, 0.4, 0.48, 0.55, 0.62),
  ];
  return (
    <View style={styles.weekCard}>
      <Text style={styles.headText}>Esta semana</Text>
      <View style={styles.weekFiguresList}>
        {FIGURES.map((f, i) => (
          <View key={f.label} style={styles.figureRow}>
            <Layer style={styles.figureOn} opacity={on[i]} testID={`figure-${i}`} />
            <Text style={styles.weekLabel}>{f.label}</Text>
            <Text style={styles.figureValue}>{f.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const DEMOS: Partial<Record<NoveltyDemoId, () => React.JSX.Element>> = {
  'athlete-blocks-group': GroupDemo,
  'athlete-blocks-fold': FoldDemo,
  'athlete-blocks-progress': ProgressDemo,
  'athlete-weekly-ring': WeeklyRingDemo,
  'athlete-weekly-figures': WeeklyFiguresDemo,
};

// Escenario con su descripción para el lector de pantalla.
export function NoveltyDemo({ slide }: { slide: NoveltySlide }) {
  const Demo = slide.demo ? DEMOS[slide.demo] : undefined;
  if (!Demo) {
    return null;
  }
  return (
    <View style={styles.stage} accessible accessibilityRole="image" accessibilityLabel={slide.demoLabel}>
      <Demo />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { backgroundColor: colors.bgApp, borderRadius: 14, padding: 12, justifyContent: 'center', minHeight: 150 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.grayBorder, overflow: 'hidden' },
  head: { height: HEAD_H, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
  headFold: { height: HEAD_H + 14 },
  headText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  badge: { backgroundColor: colors.grayLight, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  badgeDone: { backgroundColor: colors.okBg },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.inkSecondary },
  badgeTextDone: { color: colors.okInk },
  row: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: ROW_H,
    justifyContent: 'center',
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grayBorder,
  },
  rowText: { fontSize: 14, color: colors.ink },
  foldTop: { top: 0, height: HEAD_H + 14 },
  progressCard: { position: 'relative', height: HEAD_H + 14 + 2 * ROW_H + 12 },
  drawer: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.grayBorder, overflow: 'hidden' },
  drawerRow: { height: ROW_H, justifyContent: 'center', paddingHorizontal: 12 },
  bodyRow: { height: ROW_H, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.grayBorder },
  progressBox: { width: 64, height: 24, alignItems: 'center', justifyContent: 'center' },
  progressLayer: { position: 'absolute' },
  weekCard: { backgroundColor: colors.bg, borderRadius: 22, padding: 14, gap: 10, ...viewShadow },
  weekHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' },
  weekRange: { fontSize: 13, fontWeight: '600', color: colors.inkSecondary },
  weekBody: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  weekRing: { width: RING, height: RING },
  weekPercent: { fontSize: 18, fontWeight: '800', color: colors.ink },
  weekFigures: { flex: 1 },
  sessionsBox: { height: 28, justifyContent: 'center' },
  sessionsLayer: { position: 'absolute', left: 0 },
  weekBig: { fontSize: 22, fontWeight: '800', color: colors.ink },
  weekLabel: { fontSize: 13, color: colors.inkSecondary },
  weekFiguresList: { gap: 6 },
  figureRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 8, paddingHorizontal: 10, paddingVertical: 6 },
  figureOn: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12, borderWidth: 3, borderColor: colors.brand, backgroundColor: colors.bg },
  figureValue: { fontSize: 16, fontWeight: '800', color: colors.ink },
});
