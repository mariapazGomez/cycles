import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { unreadBadge, unreadLabel } from '@cycles/shared';
import { fetchUnreadCount } from '../services/notificationsApi';
import { Icon } from './Icon';
import { colors } from '../theme/colors';

// Campana de avisos del encabezado de Hoy. El número se actualiza al volver a
// la pantalla y al volver a primer plano. Diseño: docs/diseno/notificaciones.
export function NotificationBell({ onPress }: { onPress: () => void }) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const { count } = await fetchUnreadCount();
      setUnread(count);
    } catch {
      // El número es un extra: si falla, se conserva el anterior.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={unreadLabel(unread)}>
      <Icon name="bell" size={24} color={colors.ink} strokeWidth={1.8} />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadBadge(unread)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Área táctil de 44 × 44.
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 5,
    right: 3,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.blue,
    borderWidth: 2,
    borderColor: colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onBlue, fontSize: 11, fontWeight: '700', lineHeight: 13 },
});
