import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { ApiError } from '../services/httpClient';
import { ChainBackground } from '../components/ChainBackground';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { PressableScale } from '../components/PressableScale';
import { Spinner } from '../components/Spinner';
import { PRIVACY_URL, TERMS_URL } from '../config/legal';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/elevation';

// Para quien ya tenía cuenta cuando se empezó a guardar la aceptación de los
// Términos y la Política (T-147), o cuando cambia su versión: no entra a la app
// hasta aceptar la vigente. Los atletas nuevos aceptan en la web al activar su
// cuenta. La aceptación es explícita: la casilla empieza sin marcar.
export function PolicyAcceptanceScreen() {
  const { user, acceptPolicy, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (saving) {
      return;
    }
    if (!accepted) {
      setError('Debes aceptar los Términos de uso y la Política de privacidad para continuar.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await acceptPolicy();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'No pudimos guardar tu aceptación. Revisa tu conexión e inténtalo de nuevo.',
      );
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ChainBackground />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 }]}
        bounces={false}>
        <Logo />
        <View style={styles.spacer} />

        <View style={styles.card}>
          <Text style={styles.title} accessibilityRole="header">
            Antes de seguir
          </Text>
          <Text style={styles.body}>
            Para usar Cycles necesitamos que aceptes los Términos de uso y la Política de privacidad
            {user?.policyVersion ? ` (versión ${user.policyVersion})` : ''}. Léelos con calma: explican cómo cuidamos tus datos.
          </Text>

          <View style={styles.links}>
            <TouchableOpacity style={styles.link} onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
              <Text style={styles.linkText}>Términos de uso</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
              <Text style={styles.linkText}>Política de privacidad</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.banner}>
              <Icon name="alert" size={18} color={colors.painInk} />
              <Text style={styles.bannerText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setAccepted(v => !v)}
            disabled={saving}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}>
            <View style={[styles.box, accepted && styles.boxOn]}>
              {accepted && <Icon name="check" size={16} color={colors.onBlue} strokeWidth={3} />}
            </View>
            <Text style={styles.checkText}>
              Acepto los Términos de uso y la Política de privacidad. Tu coach verá tus entrenamientos y lo que
              cuentes, incluidas las notas de dolor.
            </Text>
          </TouchableOpacity>

          <PressableScale style={[styles.button, !accepted && !saving && styles.buttonIdle]} onPress={submit} disabled={saving}>
            {saving ? (
              <>
                <Spinner size={22} color={colors.onBlue} />
                <Text style={styles.buttonText}>Guardando</Text>
              </>
            ) : (
              <Text style={styles.buttonText}>Aceptar y continuar</Text>
            )}
          </PressableScale>

          <TouchableOpacity style={styles.exit} onPress={() => logout()} disabled={saving}>
            <Text style={styles.exitText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, paddingHorizontal: 18 },
  spacer: { flex: 1, minHeight: 40 },
  card: {
    backgroundColor: colors.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.grayBorder,
    padding: 20,
    ...cardShadow,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  links: { marginTop: 8, marginBottom: 14 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.blue, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  banner: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.painBg,
    borderWidth: 1,
    borderColor: '#f3b9b9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  bannerText: { flex: 1, color: colors.painInk, fontSize: 13 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44, marginBottom: 18 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.controlBorder,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.ink },
  button: {
    backgroundColor: colors.blue,
    borderRadius: 999,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonIdle: { opacity: 0.55 },
  buttonText: { color: colors.onBlue, fontSize: 16, fontWeight: '700' },
  exit: { alignItems: 'center', minHeight: 44, justifyContent: 'center', marginTop: 8 },
  exitText: { color: colors.inkSecondary, fontSize: 14, fontWeight: '600' },
});
