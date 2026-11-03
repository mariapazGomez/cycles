import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTourAnchor } from '../../store/TourContext';

// Envuelve un elemento para que la guía pueda señalarlo con un halo.
export function TourAnchor({
  id,
  radius,
  label,
  style,
  children,
}: {
  id: string;
  radius?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const ref = useTourAnchor(id, radius, label);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
