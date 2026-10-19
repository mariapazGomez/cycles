import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationCopy, notificationTime, type AppNotification } from '@cycles/shared';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notificationsApi';
import type { AppStackParamList } from '../navigation/types';
import { ChainBackground } from '../components/ChainBackground';
import { Icon } from '../components/Icon';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/elevation';

type Props = NativeStackScreenProps<AppStackParamList, 'Notifications'>;

// Pantalla «Avisos» del atleta. No es una cuarta pestaña: se abre desde la
// campana de Hoy y la isla de pestañas no se muestra. Diseño y copy:
// docs/diseno/notificaciones/README.md.
export function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      setItems(await fetchNotifications());
    } catch {
      setFailed(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Al volver a primer plano se actualiza la lista.
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const unread = items?.filter(n => !n.read).length ?? 0;

  const open = async (item: AppNotification) => {
    if (!item.read) {
      setItems(list => list?.map(n => (n.id === item.id ? { ...n, read: true } : n)) ?? list);
      try {
        await markNotificationRead(item.id);
      } catch {
        // Se vuelve a sincronizar al volver a esta pantalla.
      }
    }
    const { target } = notificationCopy(item);
    if (target.kind === 'session') {
      navigation.navigate('SessionDetail', { sessionId: target.sessionId });
    } else if (target.kind === 'plan') {
      navigation.navigate('Tabs', { screen: 'Calendar' });
    }
  };

  const markAll = async () => {
    setItems(list => list?.map(n => ({ ...n, read: true })) ?? list);
    try {
      await markAllNotificationsRead();
    } catch {
      load();
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Volver">
          <Icon name="chevronLeft" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">
          Avisos
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {unread > 0 && (
          <TouchableOpacity style={styles.markAll} onPress={markAll} accessibilityRole="button">
            <Text style={styles.markAllText}>Marcar todo como leído</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.card, cardShadow]}>
          {failed && (
            <View style={styles.state}>
              <Text style={styles.stateTitle}>No pudimos cargar tus avisos.</Text>
              <Text style={styles.stateText}>Revisa tu conexión e inténtalo de nuevo.</Text>
              <TouchableOpacity style={styles.retry} onPress={load} accessibilityRole="button">
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {!failed && items === null &&
            [0, 1, 2].map(i => (
              <View key={i} style={[styles.row, i > 0 && styles.rowBorder]}>
                <View style={[styles.bead, styles.skeleton]} />
                <View style={styles.skeletonLines}>
                  <View style={styles.skeleton} />
                  <View style={[styles.skeleton, { width: '70%' }]} />
                </View>
              </View>
            ))}

          {!failed && items !== null && items.length === 0 && (
            <View style={styles.state}>
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <ChainBackground />
              </View>
              <Text style={styles.stateTitle}>Todo al día.</Text>
              <Text style={styles.stateText}>Cuando tu coach cambie algo en tu ciclo, lo verás aquí.</Text>
            </View>
          )}

          {!failed &&
            items?.map((item, index) => {
              const copy = notificationCopy(item);
              const icon = copy.icon === 'initials' ? 'plan' : copy.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.row,
                    index > 0 && styles.rowBorder,
                    item.read ? styles.rowRead : styles.rowUnread,
                  ]}
                  onPress={() => open(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.title}. ${copy.text}`}>
                  <View style={[styles.bead, item.read ? styles.beadRead : styles.beadUnread]}>
                    <Icon
                      name={icon}
                      size={18}
                      color={item.read ? colors.inkSecondary : colors.onBlue}
                      strokeWidth={1.8}
                    />
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.rowTitle}>{copy.title}</Text>
                    <Text style={[styles.rowText, item.read && styles.rowTextRead]}>{copy.text}</Text>
                  </View>
                  <Text style={styles.when}>{notificationTime(item.at)}</Text>
                </TouchableOpacity>
              );
            })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: colors.ink, marginLeft: 4 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  markAll: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  markAllText: { color: colors.blue, fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: colors.bg, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44, padding: 14 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.grayBorder },
  rowUnread: { backgroundColor: colors.blueTint },
  rowRead: { backgroundColor: colors.bg },
  bead: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  beadUnread: { backgroundColor: colors.blue },
  beadRead: { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.grayBorder },
  body: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 14.7, fontWeight: '700', color: colors.ink },
  rowText: { fontSize: 14, lineHeight: 20, color: colors.ink },
  rowTextRead: { color: colors.inkSecondary },
  when: { fontSize: 12.5, color: colors.inkSecondary, paddingTop: 2 },
  state: { alignItems: 'center', paddingVertical: 34, paddingHorizontal: 24, overflow: 'hidden' },
  stateTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 4, textAlign: 'center' },
  stateText: { fontSize: 14.5, color: colors.inkSecondary, textAlign: 'center', maxWidth: 260 },
  retry: {
    marginTop: 14,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: colors.ink,
    borderRadius: 999,
  },
  retryText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  skeleton: { height: 10, borderRadius: 5, backgroundColor: colors.grayLight },
  skeletonLines: { flex: 1, gap: 8, paddingTop: 4 },
});
