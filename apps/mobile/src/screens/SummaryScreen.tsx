import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarClearance } from '../components/FloatingTabBar';
import { colors } from '../theme/colors';

// Marcador de la pestaña: el diseño aprobado se implementa en el paso 3.
export function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const clearance = useTabBarClearance();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: clearance }]}>
      <Text style={styles.title}>Resumen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp, paddingHorizontal: 16 },
  title: { fontSize: 32, fontWeight: '800', color: colors.ink },
});
