import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Pearl } from '../pearl/Pearl';
import { PEARL_KINDS } from '../pearl/kinds';
import { colors } from '../../theme/colors';
import { viewShadow } from '../../theme/elevation';
import type { CoachNotice as Notice } from '../../utils/coachNotice';

interface Props {
  notice: Notice;
  onOpen: () => void;
}

// Tarjeta «Tu coach agregó una rutina» (diseño vistas-app): toda ella es un botón de 56 px
// o más; solo aparece si hay algo nuevo y desaparece al abrirla. Sin puntos medios en el texto.
export function CoachNotice({ notice, onOpen }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${notice.title}: ${notice.detail}. Abrir`}>
      <Pearl kind={PEARL_KINDS.coachStrength} size={34} />
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
  info: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: colors.ink },
  detail: { fontSize: 13, color: colors.inkSecondary },
  open: { fontSize: 14, fontWeight: '700', color: colors.blue },
});

