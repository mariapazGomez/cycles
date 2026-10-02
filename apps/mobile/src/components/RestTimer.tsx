import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ADJUST_STEP_SECONDS, useRestTimer } from '../store/RestTimerContext';
import { colors } from '../theme/colors';
import { formatClock } from '../utils/time';

const BEADS = 24;
const RING_SIZE = 220;
const RING_RADIUS = 96;

// Anillo de cuentas: eco del motivo de cadena de la marca y del isotipo.
// Sin dependencias de SVG; cada cuenta es un círculo posicionado en el anillo.
function BeadRing({ fraction, label, caption }: { fraction: number; label: string; caption: string }) {
  const filled = Math.ceil(BEADS * fraction);
  return (
    <View style={styles.ring}>
      {Array.from({ length: BEADS }, (_, i) => {
        const angle = (i / BEADS) * 2 * Math.PI - Math.PI / 2;
        const size = i % 3 === 0 ? 16 : 12;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              left: RING_SIZE / 2 + RING_RADIUS * Math.cos(angle) - size / 2,
              top: RING_SIZE / 2 + RING_RADIUS * Math.sin(angle) - size / 2,
              backgroundColor: i < filled ? colors.brand : colors.blueTint,
            }}
          />
        );
      })}
      <Text style={styles.ringTime}>{label}</Text>
      <Text style={styles.ringCaption}>{caption}</Text>
    </View>
  );
}

export function RestModal() {
  const { remaining, total, expanded, setExpanded, adjust, skip } = useRestTimer();
  const visible = expanded && remaining !== null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => setExpanded(false)}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Pausa</Text>
          <TouchableOpacity onPress={() => setExpanded(false)} accessibilityLabel="Minimizar pausa">
            <Text style={styles.link}>Minimizar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalBody}>
          <BeadRing
            fraction={remaining !== null && total > 0 ? remaining / total : 0}
            label={formatClock(remaining ?? 0)}
            caption={`de ${formatClock(total)}`}
          />
          <View style={styles.adjustRow}>
            <TouchableOpacity style={styles.secondary} onPress={() => adjust(-ADJUST_STEP_SECONDS)}>
              <Text style={styles.secondaryText}>−{ADJUST_STEP_SECONDS} s</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => adjust(ADJUST_STEP_SECONDS)}>
              <Text style={styles.secondaryText}>+{ADJUST_STEP_SECONDS} s</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.skip} onPress={skip}>
          <Text style={styles.skipText}>Saltar pausa</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// Barra compacta que se muestra sobre el botón principal mientras hay una
// pausa en curso y la pantalla completa está minimizada.
export function RestBar() {
  const { remaining, total, setExpanded, skip } = useRestTimer();
  if (remaining === null) {
    return null;
  }
  const fraction = total > 0 ? remaining / total : 0;
  return (
    <TouchableOpacity style={styles.bar} onPress={() => setExpanded(true)} activeOpacity={0.85}>
      <View style={styles.barText}>
        <Text style={styles.barLabel}>Pausa</Text>
        <Text style={styles.barTime}>{formatClock(remaining)}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.round(fraction * 100)}%` }]} />
        </View>
      </View>
      <TouchableOpacity style={styles.barSkip} onPress={skip}>
        <Text style={styles.barSkipText}>Saltar</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: colors.bg, padding: 20, paddingTop: 56 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 24, fontWeight: '700', color: colors.ink },
  link: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  modalBody: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringTime: { fontSize: 52, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] },
  ringCaption: { fontSize: 12, color: colors.inkSecondary, marginTop: 2 },
  adjustRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  secondary: {
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  skip: { backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  skipText: { color: colors.onBlue, fontSize: 16, fontWeight: '600' },
  bar: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  barText: { flex: 1 },
  barLabel: { fontSize: 11, color: colors.grayBorder },
  barTime: { fontSize: 20, fontWeight: '700', color: colors.onBlue, fontVariant: ['tabular-nums'] },
  barTrack: { height: 4, borderRadius: 2, backgroundColor: colors.inkTrack, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: colors.brand },
  barSkip: {
    borderWidth: 1,
    borderColor: colors.grayMid,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  barSkipText: { color: colors.onBlue, fontSize: 12, fontWeight: '600' },
});
