import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/elevation';

export const TAB_BAR_HEIGHT = 52;
export const TAB_BAR_BOTTOM_GAP = 12;

const ITEMS: Record<string, { icon: IconName; label: string }> = {
  Calendar: { icon: 'calendar', label: 'Calendario' },
  Today: { icon: 'barbell', label: 'Inicio' },
  Summary: { icon: 'chart', label: 'Resumen' },
};

// Alto que las pantallas deben reservar abajo para que su contenido no
// quede tapado por la isla.
export function useTabBarClearance() {
  const insets = useSafeAreaInsets();
  return insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 24;
}

// Barra inferior en forma de isla flotante: píldora separada de los bordes;
// solo la opción activa muestra su etiqueta.
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_BOTTOM_GAP }]}>
      <View style={styles.island}>
        {state.routes.map((route, index) => {
          const item = ITEMS[route.name];
          if (!item) {
            return null;
          }
          const focused = state.index === index;
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
            <PressableScale
              key={route.key}
              onPress={onPress}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: focused }}
              style={[styles.item, focused && styles.itemActive]}>
              <Icon name={item.icon} size={20} color={focused ? colors.blue : colors.inkSecondary} />
              {focused && <Text style={styles.label}>{item.label}</Text>}
            </PressableScale>
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
    gap: 4,
    paddingHorizontal: 6,
    ...cardShadow,
  },
  item: {
    height: 40,
    minWidth: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  itemActive: { backgroundColor: colors.blueTint, paddingHorizontal: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.blue },
});
