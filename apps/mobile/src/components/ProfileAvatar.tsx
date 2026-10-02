import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/elevation';

// Avatar con las iniciales de la persona; abre un menú con su nombre,
// correo y la salida. Va arriba a la derecha de las pantallas principales.
export function ProfileAvatar() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const initials =
    (user?.name ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || '·';

  return (
    <>
      <TouchableOpacity style={styles.avatar} onPress={() => setOpen(true)} accessibilityLabel="Abrir perfil">
        <Text style={styles.avatarText}>{initials}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { top: insets.top + 56 }]}>
            <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                setOpen(false);
                logout();
              }}>
              <Text style={styles.itemText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.onBlue, fontSize: 13, fontWeight: '700' },
  backdrop: { flex: 1 },
  menu: {
    position: 'absolute',
    right: 16,
    width: 230,
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 14,
    ...cardShadow,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink },
  email: { fontSize: 12, color: colors.inkSecondary, marginTop: 2, marginBottom: 10 },
  item: { borderTopWidth: 1, borderTopColor: colors.grayBorder, paddingTop: 12 },
  itemText: { color: colors.painInk, fontSize: 15, fontWeight: '600' },
});
