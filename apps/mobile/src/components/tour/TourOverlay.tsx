import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { TOUR_STEPS, useTour, type TourAnchorInfo, type TourNode } from '../../store/TourContext';
import { colors } from '../../theme/colors';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const GAP = 4;
const BALLOON_MAX = 280;
const MARGIN = 16;

function measure(node: { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null) {
  return new Promise<Rect | null>(resolve => {
    if (!node || typeof node.measureInWindow !== 'function') {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null));
  });
}

const same = (a: Rect | null, b: Rect | null) =>
  a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);

// Qué elemento señala cada marca y qué dice el globo (hasta 12 palabras).
function resolveStep(step: number, get: (id: string) => TourAnchorInfo | undefined) {
  const present = (id: string) => (get(id)?.ref.current ? get(id) : undefined);
  if (step === 0) {
    const start = present('start');
    if (start) {
      return { info: start, text: `Toca ${start.label ?? 'el botón'} cuando vayas a entrenar.` };
    }
    // Sin coach o sin ciclo no hay botón: se señala la tarjeta vacía.
    return { info: present('todayEmpty'), text: 'Aquí aparecerá tu sesión de hoy.' };
  }
  if (step === 1) {
    return { info: present('tab:Calendar'), text: 'Toca Calendario.' };
  }
  return { info: present('tab:Summary'), text: 'Toca Resumen.' };
}

// Capa de la guía: un halo sobre el elemento real y un globo corto. No atenúa
// la pantalla ni bloquea toques (la persona puede tocar el elemento señalado),
// y no tiene movimiento propio.
export function TourOverlay() {
  const tour = useTour();
  const { width: screenWidth } = useWindowDimensions();
  const rootRef = useRef<TourNode>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [origin, setOrigin] = useState<Rect | null>(null);
  const visible = tour?.visible ?? false;
  const step = tour?.step ?? 0;
  const version = tour?.anchorsVersion ?? 0;

  // El elemento puede moverse (carga de datos, desplazamiento): se vuelve a medir.
  useEffect(() => {
    if (!tour || !visible) {
      setRect(null);
      return;
    }
    let active = true;
    const run = async () => {
      const { info } = resolveStep(step, tour.getAnchor);
      const [target, root] = await Promise.all([measure(info?.ref.current ?? null), measure(rootRef.current)]);
      if (active) {
        setRect(prev => (same(prev, target) ? prev : target));
        setOrigin(prev => (same(prev, root) ? prev : root));
      }
    };
    run();
    const timer = setInterval(run, 300);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [tour, visible, step, version]);

  const resolved = tour && visible ? resolveStep(step, tour.getAnchor) : null;

  useEffect(() => {
    if (resolved && rect) {
      AccessibilityInfo.announceForAccessibility(`Paso ${step + 1} de ${TOUR_STEPS}. ${resolved.text}`);
    }
    // Se anuncia al cambiar de marca, no en cada medición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, visible, rect !== null, resolved?.text]);

  if (!tour || !visible || !resolved || !rect) {
    return <View ref={rootRef} pointerEvents="none" style={StyleSheet.absoluteFill} collapsable={false} />;
  }

  // Coordenadas de la ventana → coordenadas de esta capa.
  const x = rect.x - (origin?.x ?? 0);
  const y = rect.y - (origin?.y ?? 0);
  const layerHeight = origin?.height ?? 0;
  const radius = Math.min(resolved.info?.radius ?? 10, rect.height / 2) + GAP;
  const width = Math.min(BALLOON_MAX, screenWidth - MARGIN * 2);
  const centerX = x + rect.width / 2;
  const left = Math.max(MARGIN, Math.min(centerX - width / 2, screenWidth - MARGIN - width));
  const below = y + rect.height / 2 < layerHeight / 2;
  const last = step >= TOUR_STEPS - 1;

  return (
    <View ref={rootRef} pointerEvents="box-none" style={StyleSheet.absoluteFill} collapsable={false}>
      <View
        pointerEvents="none"
        style={[
          styles.halo,
          { left: x - GAP, top: y - GAP, width: rect.width + GAP * 2, height: rect.height + GAP * 2, borderRadius: radius },
        ]}
      />
      <View
        accessibilityRole="summary"
        accessibilityLabel={`Guía de inicio. Paso ${step + 1} de ${TOUR_STEPS}. ${resolved.text}`}
        accessibilityLiveRegion="polite"
        style={[
          styles.balloon,
          { left, width },
          below ? { top: y + rect.height + GAP + 12 } : { bottom: layerHeight - y + GAP + 12 },
        ]}>
        <View
          style={[
            styles.arrow,
            { left: Math.max(14, Math.min(centerX - left - 6, width - 26)) },
            below ? styles.arrowUp : styles.arrowDown,
          ]}
        />
        <Text style={styles.step}>{`Paso ${step + 1} de ${TOUR_STEPS}`}</Text>
        <Text style={styles.text}>{resolved.text}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primary}
            onPress={tour.next}
            accessibilityRole="button"
            accessibilityLabel={last ? 'Listo' : 'Siguiente'}>
            <Text style={styles.primaryText}>{last ? 'Listo' : 'Siguiente'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondary}
            onPress={tour.skip}
            accessibilityRole="button"
            accessibilityLabel="Saltar la guía">
            <Text style={styles.secondaryText}>Saltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.brand,
    backgroundColor: 'rgba(48, 128, 252, 0.10)',
  },
  balloon: {
    position: 'absolute',
    backgroundColor: colors.ink,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  arrow: { position: 'absolute', width: 12, height: 12, backgroundColor: colors.ink, transform: [{ rotate: '45deg' }] },
  arrowUp: { top: -6 },
  arrowDown: { bottom: -6 },
  step: { fontSize: 12, color: colors.inkMuted, marginBottom: 4 },
  text: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.onBlue },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  primary: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontSize: 14, fontWeight: '700', color: colors.onBlue },
  secondary: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 14, fontWeight: '600', color: colors.inkMuted },
});
