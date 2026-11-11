import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BLOCK_TYPE_COLOR, type NoveltyDemoId, type NoveltySlide } from '@cycles/shared';
import { Pearl } from '../pearl/Pearl';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { WeekRing } from '../today/WeekRing';
import { viewShadow } from '../../theme/elevation';

// Demostraciones de las novedades de la app, dibujadas en código con el aspecto de la interfaz.
// Cada una tiene fases; la última es el RESULTADO FINAL. Con «reducir movimiento» solo se
// muestra esa (imagen fija); si no, las fases se repiten despacio (sin parpadeos).
const PHASE_MS = 1800;

function usePhase(phases: number): number {
  const reduce = useReduceMotion();
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (reduce) {
      return undefined;
    }
    const id = setInterval(() => setPhase(p => (p + 1) % phases), PHASE_MS);
    return () => clearInterval(id);
  }, [reduce, phases]);
  return reduce ? phases - 1 : phase;
}

const BLOCKS = [
  { name: 'Calentamiento', glyph: 'warm', color: BLOCK_TYPE_COLOR.warmup, rows: ['Movilidad de cadera'] },
  { name: 'Pliometría', glyph: 'plyo', color: BLOCK_TYPE_COLOR.plyometrics, rows: ['Saltos al cajón'] },
  { name: 'Fuerza', glyph: 'weights', color: BLOCK_TYPE_COLOR.strength, rows: ['Sentadilla', 'Peso muerto'] },
] as const;

function Row({ text }: { text: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

function Header({ block, badge, chevron }: { block: (typeof BLOCKS)[number]; badge?: string; chevron?: 'chevronDown' | 'chevronRight' }) {
  return (
    <View style={styles.head}>
      <Pearl kind={{ glyph: block.glyph }} color={block.color} size={28} />
      <Text style={styles.headText}>{block.name}</Text>
      {badge ? (
        <View style={[styles.badge, badge === 'Hecho' && styles.badgeDone]}>
          <Text style={[styles.badgeText, badge === 'Hecho' && styles.badgeTextDone]}>{badge}</Text>
        </View>
      ) : null}
      {chevron ? <Icon name={chevron} size={18} color={colors.inkSecondary} /> : null}
    </View>
  );
}

// 1. Una lista plana se ordena en tres bloques de colores.
function GroupDemo() {
  const grouped = usePhase(2) === 1;
  if (!grouped) {
    return (
      <>
        {BLOCKS.flatMap(b => b.rows).map(r => (
          <Row key={r} text={r} />
        ))}
      </>
    );
  }
  return (
    <>
      {BLOCKS.slice(0, 3).map(b => (
        <View key={b.name} style={styles.block}>
          <Header block={b} />
        </View>
      ))}
    </>
  );
}

// 2. Se toca el encabezado de «Fuerza»: sus ejercicios se muestran y se esconden.
function FoldDemo() {
  const open = usePhase(2) === 1;
  return (
    <>
      <View style={styles.block}>
        <Header block={BLOCKS[0]} badge="Hecho" chevron="chevronRight" />
      </View>
      <View style={styles.block}>
        <Header block={BLOCKS[2]} badge="0 de 2" chevron={open ? 'chevronDown' : 'chevronRight'} />
        {open ? BLOCKS[2].rows.map(r => <Row key={r} text={r} />) : null}
      </View>
    </>
  );
}

// 3. El avance de un bloque: «0 de 2», «1 de 2» y «Hecho».
function ProgressDemo() {
  const phase = usePhase(3);
  const badge = ['0 de 2', '1 de 2', 'Hecho'][phase];
  return (
    <View style={styles.block}>
      <Header block={BLOCKS[2]} badge={badge} />
      {BLOCKS[2].rows.map((r, i) => (
        <View key={r} style={styles.row}>
          <Text style={styles.rowText}>{r}</Text>
          {phase > i ? <Icon name="check" size={16} color={colors.okInk} /> : null}
        </View>
      ))}
    </View>
  );
}

// 4. La tarjeta «Esta semana»: el anillo pasa de 0 a 33 y a 67 %, con sus sesiones («0, 1, 2 de 3»).
const RING_STEPS = [
  { percent: 0, sessions: '0 de 3' },
  { percent: 33, sessions: '1 de 3' },
  { percent: 67, sessions: '2 de 3' },
];
function WeeklyRingDemo() {
  const step = RING_STEPS[usePhase(RING_STEPS.length)];
  return (
    <View style={styles.weekCard}>
      <View style={styles.weekHead}>
        <Text style={styles.headText}>Esta semana</Text>
        <Text style={styles.weekRange}>9 al 15 nov</Text>
      </View>
      <View style={styles.weekBody}>
        <View style={styles.weekRing}>
          <WeekRing percent={step.percent} size={76} />
          <View style={styles.weekPercentBox}>
            <Text style={styles.weekPercent}>{`${step.percent}%`}</Text>
          </View>
        </View>
        <View style={styles.weekFigures}>
          <Text style={styles.weekBig}>{step.sessions}</Text>
          <Text style={styles.weekLabel}>sesiones</Text>
        </View>
      </View>
    </View>
  );
}

// 5. Las tres cifras de la semana: se resalta una a una y al final quedan las tres sin resaltar.
const FIGURES = [
  { label: 'Sesiones', value: '2 de 3' },
  { label: 'Tiempo entrenado', value: '3 h 20 min' },
  { label: 'Esfuerzo medio', value: '6,5' },
];
function WeeklyFiguresDemo() {
  const phase = usePhase(FIGURES.length + 1);
  return (
    <View style={styles.weekCard}>
      <Text style={styles.headText}>Esta semana</Text>
      <View style={styles.weekFiguresList}>
        {FIGURES.map((f, i) => (
          <View key={f.label} style={[styles.figureRow, phase === i && styles.figureOn]}>
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

// Escenario fijo con su descripción para el lector de pantalla.
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
  stage: { backgroundColor: colors.bgApp, borderRadius: 14, padding: 12, gap: 8, minHeight: 150, justifyContent: 'center' },
  block: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.grayBorder, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  headText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  badge: { backgroundColor: colors.grayLight, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  badgeDone: { backgroundColor: colors.okBg },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.inkSecondary },
  badgeTextDone: { color: colors.okInk },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.grayBorder,
  },
  rowText: { fontSize: 14, color: colors.ink },
  weekCard: { backgroundColor: colors.bg, borderRadius: 22, padding: 14, gap: 10, ...viewShadow },
  weekHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' },
  weekRange: { fontSize: 13, fontWeight: '600', color: colors.inkSecondary },
  weekBody: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  weekRing: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  weekPercentBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  weekPercent: { fontSize: 18, fontWeight: '800', color: colors.ink },
  weekFigures: { flex: 1 },
  weekBig: { fontSize: 22, fontWeight: '800', color: colors.ink },
  weekLabel: { fontSize: 13, color: colors.inkSecondary },
  weekFiguresList: { gap: 6 },
  figureRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    columnGap: 8,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: 'transparent',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  figureOn: { borderColor: colors.brand, backgroundColor: colors.bg, ...viewShadow },
  figureValue: { fontSize: 16, fontWeight: '800', color: colors.ink },
});
