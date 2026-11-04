import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as accountApi from '../services/accountApi';
import { ApiError } from '../services/httpClient';
import { useAuth } from '../store/AuthContext';
import { AppleSignInCancelled, isAppleSignInAvailable, requestAppleAuthorizationCode } from '../services/appleSignIn';
import type { AppStackParamList } from '../navigation/types';
import { Icon } from '../components/Icon';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/elevation';

type Props = NativeStackScreenProps<AppStackParamList, 'Account'>;

export const CONFIRM_WORD = 'ELIMINAR';

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Algo salió mal. Intenta de nuevo.';
}

// «Mi cuenta» del atleta: consentimiento de estadísticas, descarga de datos y
// eliminar la cuenta. Apple exige poder iniciar el borrado dentro de la app
// (regla 5.1.1(v)). Ver docs/prds/features/PRD-PrivacidadYTerminos.md.
export function AccountScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState<'consent' | 'export' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: 'consent' | 'export' | 'delete', action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const toggleConsent = (value: boolean) =>
    run('consent', async () => {
      await accountApi.setDataConsent(value);
      await refreshUser();
    });

  const download = () =>
    run('export', async () => {
      const data = await accountApi.exportMyData();
      await Share.share({ title: 'Mis datos de Cycles', message: JSON.stringify(data, null, 2) });
    });

  const remove = () =>
    run('delete', async () => {
      // Quien entra con Apple confirma con Apple: así se revoca su autorización
      // al eliminar. Si cierra la hoja de Apple, no se elimina nada.
      let appleCode: string | undefined;
      if (user?.hasAppleIdentity && isAppleSignInAvailable) {
        try {
          appleCode = await requestAppleAuthorizationCode();
        } catch (e) {
          if (e instanceof AppleSignInCancelled) {
            return;
          }
          throw e;
        }
      }
      await accountApi.deleteMyAccount(confirmation, appleCode);
      await logout();
    });

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
          Mi cuenta
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitle}>Tus datos</Text>
          <Text style={styles.value}>{user?.name}</Text>
          <Text style={styles.muted}>{user?.email}</Text>
        </View>

        <View style={[styles.card, cardShadow]}>
          <View style={styles.switchRow}>
            <Text style={[styles.body, styles.flex]}>
              Permito que Cycles use mis datos, sin mi nombre, para mejorar la app.
            </Text>
            <Switch
              value={Boolean(user?.dataConsentAt)}
              onValueChange={toggleConsent}
              disabled={busy !== null}
              accessibilityLabel="Permitir el uso de mis datos para estadísticas"
            />
          </View>
        </View>

        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitle}>Descargar mis datos</Text>
          <Text style={styles.body}>Un archivo con todo lo que Cycles guarda de ti.</Text>
          <TouchableOpacity
            style={styles.secondary}
            onPress={download}
            disabled={busy !== null}
            accessibilityRole="button">
            {busy === 'export' ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.secondaryText}>Descargar mis datos</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardTitle}>Eliminar mi cuenta</Text>
          <Text style={styles.body}>
            Se borran tu cuenta y todo tu historial: series, cierres de sesión y avisos. No se puede
            deshacer. Los planes que tu coach creó para ti se quedan en su Biblioteca, sin tu nombre.
          </Text>
          {user?.hasAppleIdentity && isAppleSignInAvailable && (
            <Text style={[styles.body, styles.appleNote]}>
              Como entras con Apple, te pediremos confirmarlo con Apple para retirar también su acceso.
            </Text>
          )}
          <Text style={styles.label}>
            Para confirmar, escribe <Text style={styles.bold}>{CONFIRM_WORD}</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Escribe ELIMINAR para confirmar"
          />
          <TouchableOpacity
            style={[styles.danger, (confirmation !== CONFIRM_WORD || busy !== null) && styles.disabled]}
            onPress={remove}
            disabled={confirmation !== CONFIRM_WORD || busy !== null}
            accessibilityRole="button">
            {busy === 'delete' ? (
              <ActivityIndicator color={colors.onBlue} />
            ) : (
              <Text style={styles.dangerText}>Eliminar mi cuenta</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink, marginLeft: 4 },
  content: { paddingHorizontal: 16, gap: 12 },
  card: { backgroundColor: colors.bg, borderRadius: 16, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  value: { fontSize: 15, fontWeight: '600', color: colors.ink },
  muted: { fontSize: 13, color: colors.inkSecondary, marginTop: 2 },
  body: { fontSize: 14, color: colors.inkSecondary, lineHeight: 20 },
  flex: { flex: 1 },
  appleNote: { marginTop: 10 },
  bold: { fontWeight: '700', color: colors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 14, color: colors.ink, marginTop: 14, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    fontSize: 16,
    color: colors.ink,
  },
  secondary: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontSize: 15, fontWeight: '600', color: colors.ink },
  danger: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: colors.painInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { fontSize: 15, fontWeight: '600', color: colors.onBlue },
  disabled: { opacity: 0.4 },
  errorBox: { backgroundColor: colors.painBg, borderRadius: 12, padding: 12 },
  errorText: { color: colors.painInk, fontSize: 14 },
});
