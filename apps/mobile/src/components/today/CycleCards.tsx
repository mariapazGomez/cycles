import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { cardShadow } from '../../theme/elevation';
import { cardDayLabel, cardTitle, compactLine, type OpenCard, type TodayCard } from '../../utils/todayCycles';
import { BeadChain } from '../BeadChain';
import { Icon } from '../Icon';
import { PressableScale } from '../PressableScale';
import { Spinner } from '../Spinner';

// Tarjetas de «Hoy» con dos ciclos a la vez (CYC-314). Cada una lleva el nombre de su ciclo;
// no se inventan colores por ciclo.

interface HeroProps {
  card: OpenCard;
  todayIso: string;
  // Solo una tarjeta lleva el botón relleno; las demás van en contorno.
  primary: boolean;
  starting: boolean;
  // Texto del botón y qué hace: iniciar, continuar o cerrar.
  action: { label: string; onPress: () => void };
}

export function CycleHero({ card, todayIso, primary, starting, action }: HeroProps) {
  const exercises = card.session.sessionExercises;
  const done = exercises.filter(e => e.logs.length >= e.targetSets).length;
  const date = card.session.scheduledDate;
  return (
    <View style={styles.hero}>
      <BeadChain />
      <View style={styles.heroTop}>
        <View style={styles.heroPill}>
          <Text style={styles.heroPillText} numberOfLines={1}>{card.cycle.name}</Text>
        </View>
        <Text style={styles.heroWeek}>Semana {card.cycle.currentWeek}</Text>
      </View>
      <Text style={styles.heroTitle}>{cardTitle(card)}</Text>
      {card.kind !== 'pending' && date && !card.session.startedAt ? (
        <Text style={styles.heroDate}>
          {card.kind === 'upcoming' ? 'Próxima: ' : 'Era para el '}
          {cardDayLabel(date, todayIso)}
        </Text>
      ) : null}
      <View style={styles.heroMid}>
        <View style={styles.heroCount}>
          <Text style={styles.heroNumber}>{done}</Text>
          <Text style={styles.heroOf}>de {exercises.length} ejercicios</Text>
        </View>
        <View style={styles.segments}>
          {exercises.map(e => (
            <View key={e.id} style={[styles.segment, e.logs.length >= e.targetSets && styles.segmentDone]} />
          ))}
        </View>
      </View>
      <PressableScale
        style={[styles.button, !primary && styles.buttonOutline, starting && styles.disabled]}
        onPress={action.onPress}
        disabled={starting}
        accessibilityRole="button"
        accessibilityLabel={`${action.label}, ${card.cycle.name}`}>
        {starting ? (
          <Spinner size={22} color={primary ? colors.ink : colors.onBlue} />
        ) : (
          <>
            <Text style={[styles.buttonText, !primary && styles.buttonTextOutline]} numberOfLines={1}>{action.label}</Text>
            <Icon name="arrowRight" size={20} color={primary ? colors.ink : colors.onBlue} />
          </>
        )}
      </PressableScale>
    </View>
  );
}

interface CompactProps {
  card: TodayCard;
  todayIso: string;
  // «Ver» en una por hacer; «Compartir» en una hecha.
  onPress: () => void;
}

export function CycleCompact({ card, todayIso, onPress }: CompactProps) {
  const done = card.kind === 'done';
  const action = done ? 'Compartir' : 'Ver';
  return (
    <View style={styles.compact}>
      {done && (
        <View style={styles.check}>
          <Icon name="check" size={18} color={colors.onBlue} strokeWidth={2.5} />
        </View>
      )}
      <View style={styles.compactInfo}>
        <View style={styles.compactPill}>
          <Text style={styles.compactPillText} numberOfLines={1}>{card.cycle.name}</Text>
        </View>
        <Text style={styles.compactTitle}>{cardTitle(card)}</Text>
        <Text style={styles.compactLine}>{compactLine(card, todayIso)}</Text>
      </View>
      <PressableScale
        style={styles.compactAction}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${action} ${card.session.name}, ${card.cycle.name}`}>
        <Text style={styles.compactActionText}>{action}</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.ink, borderRadius: 22, padding: 14, marginBottom: 12, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  heroPill: { flexShrink: 1, backgroundColor: colors.inkTrack, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  heroPillText: { fontSize: 12, fontWeight: '700', color: colors.onBlue },
  heroWeek: { fontSize: 12, color: colors.inkMuted },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.onBlue, marginBottom: 6 },
  heroDate: { fontSize: 13, color: colors.inkMuted, marginBottom: 6 },
  heroMid: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  heroCount: { flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  heroNumber: { fontSize: 34, lineHeight: 36, fontWeight: '800', color: colors.onBlue },
  heroOf: { fontSize: 13, color: colors.inkMuted, marginBottom: 4 },
  segments: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.inkTrack },
  segmentDone: { backgroundColor: colors.brand },
  button: {
    minHeight: 48,
    backgroundColor: colors.onBlue,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.onBlue,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonOutline: { backgroundColor: 'transparent', borderColor: colors.inkMuted },
  buttonText: { flexShrink: 1, color: colors.ink, fontSize: 15, fontWeight: '700' },
  buttonTextOutline: { color: colors.onBlue },
  disabled: { opacity: 0.6 },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bg, borderRadius: 18, padding: 14, marginBottom: 12, ...cardShadow },
  check: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.okInk, alignItems: 'center', justifyContent: 'center' },
  compactInfo: { flex: 1, gap: 3 },
  compactPill: { alignSelf: 'flex-start', backgroundColor: colors.blueTint, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 },
  compactPillText: { fontSize: 12, fontWeight: '700', color: colors.blue },
  compactTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  compactLine: { fontSize: 13, color: colors.inkSecondary },
  compactAction: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  compactActionText: { fontSize: 15, fontWeight: '700', color: colors.blue },
});
