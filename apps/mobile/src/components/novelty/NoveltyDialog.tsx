import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Novelty, NoveltySlide } from '@cycles/shared';
import { Icon } from '../Icon';
import { NoveltyDemo } from './NoveltyDemo';
import { colors } from '../../theme/colors';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useViewScale } from '../../hooks/useViewScale';
import { touchHeight } from '../../utils/viewScale';

// Popup central de una novedad (guía de novedades): velo oscuro, de 2 a 4 slides con su
// demostración. Las slides solo cambian cuando la persona lo pide. Cerrar, saltar o llegar al
// final llama a `onClose`; quien lo abrió decide si eso marca la novedad como vista.
export function NoveltyDialog({ novelty, slides, onClose }: { novelty: Novelty; slides: NoveltySlide[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReduceMotion();
  const scale = useViewScale();
  const slide = slides[index];
  if (!slide) {
    return null;
  }
  const last = index === slides.length - 1;
  const minHeight = touchHeight(scale);
  return (
    <Modal transparent visible animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.center}>
        <View style={[StyleSheet.absoluteFill, styles.scrim]} />
        <View style={styles.card} accessibilityViewIsModal>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={[styles.close, { minHeight, minWidth: minHeight }]}>
            <Icon name="close" size={20} color={colors.inkSecondary} />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.body} bounces={false}>
            <NoveltyDemo slide={slide} key={`${novelty.key}-${index}`} />
            <Text style={styles.eyebrow}>{`Novedad · ${novelty.name}`}</Text>
            <Text style={styles.title} accessibilityRole="header">
              {slide.title}
            </Text>
            <Text style={styles.text}>{slide.text}</Text>
          </ScrollView>
          <View style={styles.foot}>
            <Text style={styles.dots} accessibilityLabel={`Slide ${index + 1} de ${slides.length}`}>
              {slides.map((_, i) => (i === index ? '● ' : '○ '))}
            </Text>
            <View style={styles.buttons}>
              <TouchableOpacity accessibilityRole="button" onPress={onClose} style={[styles.skip, { minHeight }]}>
                <Text style={styles.skipText}>{last ? 'Cerrar' : 'Saltar'}</Text>
              </TouchableOpacity>
              {index > 0 && (
                <TouchableOpacity accessibilityRole="button" onPress={() => setIndex(index - 1)} style={[styles.back, { minHeight }]}>
                  <Text style={styles.backText}>Atrás</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => (last ? onClose() : setIndex(index + 1))}
                style={[styles.next, { minHeight }]}
              >
                <Text style={styles.nextText}>{last ? 'Entendido' : 'Siguiente'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  scrim: { backgroundColor: colors.ink, opacity: 0.38 },
  card: { width: '100%', maxWidth: 420, maxHeight: '92%', backgroundColor: colors.bg, borderRadius: 20, overflow: 'hidden' },
  close: { position: 'absolute', top: 4, right: 4, zIndex: 2, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, paddingTop: 44, gap: 8 },
  eyebrow: { fontSize: 12, fontWeight: '700', color: colors.blue, marginTop: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  text: { fontSize: 16, lineHeight: 23, color: colors.inkSecondary },
  foot: { padding: 16, paddingTop: 8, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.grayBorder },
  dots: { fontSize: 12, color: colors.blue, textAlign: 'center' },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skip: { justifyContent: 'center', paddingHorizontal: 8, marginRight: 'auto' },
  skipText: { fontSize: 15, fontWeight: '600', color: colors.inkSecondary },
  back: { justifyContent: 'center', paddingHorizontal: 12 },
  backText: { fontSize: 15, fontWeight: '600', color: colors.blue },
  next: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.blue, borderRadius: 999, paddingHorizontal: 20 },
  nextText: { fontSize: 15, fontWeight: '700', color: colors.onBlue },
});
