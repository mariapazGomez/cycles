import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  hasSeenFirstSessionClosing,
  hasSeenFirstSetHint,
  markFirstSessionClosingSeen,
  markFirstSetHintSeen,
} from '../../services/hintStorage';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';

// Pista de la primera serie: una sola vez, dentro del uso real (guía de primer uso).
export function useFirstSetHint() {
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    let active = true;
    hasSeenFirstSetHint().then(value => {
      if (active) {
        setSeen(value);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    setSeen(true);
    markFirstSetHintSeen();
  }, []);

  return { visible: !seen, dismiss };
}

export function FirstSetHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={styles.hint} accessible accessibilityLabel="Pista: cómo registrar tu primera serie">
      <Text style={styles.hintTitle}>Tu primera serie</Text>
      <Text style={styles.hintText}>
        Ajusta reps y peso con − y +, y toca Registrar serie. Después te preguntamos cuántas reps más podías hacer.
        Entre series corre el descanso.
      </Text>
      <TouchableOpacity style={styles.hintButton} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Entendido">
        <Text style={styles.hintButtonText}>Entendido</Text>
      </TouchableOpacity>
    </View>
  );
}

// ¿Hay que mostrar el cierre de la primera sesión? Se consulta al guardarla.
export async function shouldShowFirstSessionClosing() {
  return !(await hasSeenFirstSessionClosing());
}

export function FirstSessionClosing({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const done = () => {
    markFirstSessionClosingSeen();
    onDone();
  };
  return (
    <View style={[styles.closing, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.closingBody}>
        <View style={styles.check}>
          <Icon name="check" size={32} color={colors.onBlue} strokeWidth={2.5} />
        </View>
        <Text style={styles.closingTitle} accessibilityRole="header">
          Primera sesión guardada
        </Text>
        <Text style={styles.closingText}>Tu coach ya puede verla.</Text>
      </View>
      <TouchableOpacity style={styles.closingButton} onPress={done} accessibilityRole="button" accessibilityLabel="Volver a Inicio">
        <Text style={styles.closingButtonText}>Volver a Inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { backgroundColor: colors.blueTint, borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 12 },
  hintTitle: { fontSize: 13, fontWeight: '700', color: colors.blue, marginBottom: 4 },
  hintText: { fontSize: 14, lineHeight: 20, color: colors.ink },
  hintButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
  hintButtonText: { fontSize: 14, fontWeight: '700', color: colors.blue },
  closing: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
  closingBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  closingTitle: { fontSize: 24, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  closingText: { fontSize: 16, color: colors.inkSecondary, marginTop: 8, textAlign: 'center' },
  closingButton: {
    minHeight: 52,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closingButtonText: { fontSize: 16, fontWeight: '700', color: colors.onBlue },
});
