import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Pearl } from '../pearl/Pearl';
import { PEARL_KINDS } from '../pearl/kinds';
import { colors } from '../../theme/colors';
import { viewShadow } from '../../theme/elevation';
import type { CoachNotice as Notice } from '../../utils/coachNotice';
import { useViewScale } from '../../hooks/useViewScale';
import { scaledIcon, touchHeight } from '../../utils/viewScale';

interface Props {
  notice: Notice;
  onOpen: () => void;
}

// Tarjeta «Tu coach agregó una rutina» (diseño vistas-app): toda ella es un botón de 56 px
// o más; solo aparece si hay algo nuevo y desaparece al abrirla. Sin puntos medios en el texto.
export function CoachNotice({ notice, onOpen }: Props) {
  const scale = useViewScale();
  return (
    <TouchableOpacity
      style={[styles.card, scale.big && styles.cardStacked, { minHeight: Math.max(56, touchHeight(scale)) }]}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${notice.title}: ${notice.detail}. Abrir`}>
      <Pearl kind={PEARL_KINDS.coachStrength} size={scaledIcon(34, scale)} />
      <View style={styles.info}>
        <Text style={styles.title}>{notice.title}</Text>
        <Text style={styles.detail} numberOfLines={2}>
          {notice.detail}
        </Text>
      </View>
      <Text style={styles.open}>Abrir</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 22,
    marginBottom: 8,
    backgroundColor: colors.blueTint,
    ...viewShadow,
  },
  // Con letra grande o pantalla angosta, la perla va arriba y el texto debajo.
  cardStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: colors.ink },
  detail: { fontSize: 13, color: colors.inkSecondary },
  open: { fontSize: 14, fontWeight: '700', color: colors.blue },
});

