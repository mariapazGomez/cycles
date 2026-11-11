import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BLOCK_TYPE_COLOR, type NoveltyDemoId, type NoveltySlide } from '@cycles/shared';
import { Pearl } from '../pearl/Pearl';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';
import { useReduceMotion } from '../../hooks/useReduceMotion';

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

const DEMOS: Partial<Record<NoveltyDemoId, () => React.JSX.Element>> = {
  'athlete-blocks-group': GroupDemo,
  'athlete-blocks-fold': FoldDemo,
  'athlete-blocks-progress': ProgressDemo,
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
});
