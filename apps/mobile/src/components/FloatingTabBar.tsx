import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { TourAnchor } from './tour/TourAnchor';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/elevation';

export const TAB_BAR_HEIGHT = 52;
export const TAB_BAR_BOTTOM_GAP = 12;
// Cada pestaña ocupa el mismo ancho, así la isla mide siempre lo mismo.
const SLOT_WIDTH = 60;
const PAD = 5;

const ITEMS: Record<string, { icon: IconName; label: string }> = {
  Calendar: { icon: 'calendar', label: 'Calendario' },
  Today: { icon: 'barbell', label: 'Inicio' },
  Summary: { icon: 'chart', label: 'Resumen' },
  Assistant: { icon: 'chat', label: 'Asistente' },
};

// Alto que las pantallas deben reservar abajo para que su contenido no
// quede tapado por la isla.
export function useTabBarClearance() {
  const insets = useSafeAreaInsets();
  return insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 24;
}

// Barra inferior en forma de isla flotante: píldora separada de los bordes, de
// tamaño fijo, solo con íconos (la etiqueta va en `accessibilityLabel`). Un
// resaltado se desliza hasta la elegida.
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const visible = state.routes.filter(route => ITEMS[route.name]);
  const activeSlot = Math.max(
    0,
    visible.findIndex(route => route.key === state.routes[state.index]?.key),
  );
  const slide = useRef(new Animated.Value(activeSlot)).current;

  useEffect(() => {
    if (reduceMotion) {
      slide.setValue(activeSlot);
      return;
    }
    Animated.timing(slide, {
      toValue: activeSlot,
      duration: 280,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [activeSlot, reduceMotion, slide]);

  // Con el teclado abierto la isla taparía la caja de texto del chat.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardOpen) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_BOTTOM_GAP }]}>
      <View style={[styles.island, { width: visible.length * SLOT_WIDTH + PAD * 2 }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.highlight, { transform: [{ translateX: Animated.multiply(slide, SLOT_WIDTH) }] }]}
        />
        {visible.map((route, slot) => {
          const item = ITEMS[route.name];
          const focused = slot === activeSlot;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          return (
            <TourAnchor key={route.key} id={`tab:${route.name}`} radius={(TAB_BAR_HEIGHT - 10) / 2} style={styles.item}>
              <PressableScale
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: focused }}
                containerStyle={styles.itemPress}
                style={styles.itemPress}>
                <Icon name={item.icon} size={22} color={focused ? colors.blue : colors.inkSecondary} />
              </PressableScale>
            </TourAnchor>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  island: {
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAD,
    ...cardShadow,
  },
  highlight: {
    position: 'absolute',
    left: PAD,
    top: 5,
    width: SLOT_WIDTH,
    height: TAB_BAR_HEIGHT - 10,
    borderRadius: (TAB_BAR_HEIGHT - 10) / 2,
    backgroundColor: colors.blueTint,
  },
  item: { width: SLOT_WIDTH, height: TAB_BAR_HEIGHT - 10 },
  itemPress: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
