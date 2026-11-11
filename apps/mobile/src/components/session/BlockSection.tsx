import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BLOCK_TYPE_LABEL, blockColor, blockSummary, type WorkBlockType } from '@cycles/shared';
import { Pearl } from '../pearl/Pearl';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';
import { viewShadow } from '../../theme/elevation';
import { useViewScale } from '../../hooks/useViewScale';
import { scaledIcon, touchHeight } from '../../utils/viewScale';
import { sectionProgress, type BlockSectionData } from '../../utils/sessionBlocks';

// Pictograma de cada tipo de bloque (Phosphor «fill», los de la maqueta). «superset» está
// reservado (CYC-108): ninguna pantalla lo ofrece, pero si llega usa el genérico.
const BLOCK_GLYPH = {
  warmup: 'warm',
  plyometrics: 'plyo',
  strength: 'weights',
  mobility: 'mob',
  cooldown: 'cool',
  cardio: 'cardio',
  custom: 'star',
  superset: 'dots',
} as const;

interface Props {
  section: BlockSectionData<{ id: string; targetSets: number; logs: Array<unknown>; orderIndex: number }>;
  open: boolean;
  /** false = el bloque no se pliega (el detalle de la sesión lo muestra completo). */
  collapsible?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

// Un bloque de la sesión (diseño sesion-por-bloques, «app del atleta»): tarjeta plegable con la
// perla de su tipo, nombre, resumen y progreso. El estado va en palabras («Hecho», «1 de 2»),
// nunca solo en color. El encabezado es una zona táctil de 44 pt o más.
export function BlockSection({ section, open, collapsible = true, onToggle, children }: Props) {
  const scale = useViewScale();
  const { block } = section;
  if (!block) {
    // Ejercicios sueltos: sin encabezado, como la lista de siempre.
    return <>{children}</>;
  }
  const label = block.type === 'custom' ? block.name : block.name || BLOCK_TYPE_LABEL[block.type as WorkBlockType];
  const summary = blockSummary(section.items.map(item => item.exercise));
  const progress = sectionProgress(section);
  const done = section.state === 'done';
  const spoken = `${label}, ${summary}, ${done ? 'hecho' : progress}${collapsible ? (open ? '. Plegar' : '. Abrir') : ''}`;
  const head = (
    <View style={[styles.head, { minHeight: touchHeight(scale) }]}>
      <Pearl kind={{ glyph: BLOCK_GLYPH[block.type] }} color={blockColor(block)} size={scaledIcon(34, scale)} />
      <View style={styles.info}>
        <Text style={styles.name}>{label}</Text>
        <Text style={styles.summary}>{summary}</Text>
      </View>
      <View style={[styles.badge, done && styles.badgeDone, section.state === 'current' && styles.badgeCurrent]}>
        <Text style={[styles.badgeText, done && styles.badgeTextDone, section.state === 'current' && styles.badgeTextCurrent]}>{progress}</Text>
      </View>
      {collapsible && <Icon name={open ? 'chevronDown' : 'chevronRight'} size={20} color={colors.inkSecondary} />}
    </View>
  );
  return (
    <View style={styles.block}>
      {collapsible ? (
        <TouchableOpacity onPress={onToggle} accessibilityRole="button" accessibilityLabel={spoken} accessibilityState={{ expanded: open }}>
          {head}
        </TouchableOpacity>
      ) : (
        <View accessible accessibilityRole="header" accessibilityLabel={spoken}>
          {head}
        </View>
      )}
      {block.note ? <Text style={styles.note}>{block.note}</Text> : null}
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.bg, borderRadius: 22, padding: 10, marginBottom: 8, ...viewShadow },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800', color: colors.ink },
  summary: { fontSize: 13, color: colors.inkSecondary },
  badge: { minHeight: 28, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgApp },
  badgeDone: { backgroundColor: colors.okBg },
  badgeCurrent: { backgroundColor: colors.blueTint },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.inkSecondary },
  badgeTextDone: { color: colors.okInk },
  badgeTextCurrent: { color: colors.blue },
  note: { fontSize: 13, color: colors.inkSecondary, paddingHorizontal: 4, paddingBottom: 4 },
  body: { marginTop: 6 },
});
