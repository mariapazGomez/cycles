import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { ApiError } from '../services/httpClient';
import { ChainBackground } from '../components/ChainBackground';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { PressableScale } from '../components/PressableScale';
import { Spinner } from '../components/Spinner';
import { colors } from '../theme/colors';
import { cardShadow } from '../theme/elevation';

// Si el login tarda más que esto, se avisa que el servidor está despertando.
const SLOW_LOGIN_MS = 6000;

const FORGOT_PASSWORD_URL = 'https://app.getcycles.app/forgot-password';

function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 401) {
    return 'Correo o contraseña incorrectos. Revisa tus datos.';
  }
  return err instanceof Error ? err.message : 'No pudimos iniciar sesión.';
}

export function LoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!submitting) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), SLOW_LOGIN_MS);
    return () => clearTimeout(timer);
  }, [submitting]);

  const handleSubmit = async () => {
    if (submitting || !email || !password) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ChainBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 36 },
          ]}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <Logo />
          <View style={styles.spacer} />

          <View style={styles.card}>
            <Text style={styles.title}>Entra a tu cuenta</Text>

            {error && (
              <View style={styles.banner}>
                <Icon name="alert" size={18} color={colors.painInk} />
                <Text style={styles.bannerText}>{error}</Text>
              </View>
            )}

            <Text style={styles.label}>Correo</Text>
            <TextInput
              style={[styles.input, submitting && styles.dimmed]}
              placeholder="nombre@correo.com"
              placeholderTextColor={colors.grayMid}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              editable={!submitting}
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Contraseña</Text>
            <View
              style={[
                styles.input,
                styles.passwordRow,
                error ? styles.inputError : null,
                submitting && styles.dimmed,
              ]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Tu contraseña"
                placeholderTextColor={colors.grayMid}
                secureTextEntry={!showPassword}
                textContentType="password"
                editable={!submitting}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                hitSlop={10}
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={22} color={colors.inkSecondary} />
              </TouchableOpacity>
            </View>

            <PressableScale
              style={[styles.button, (!email || !password) && !submitting && styles.buttonIdle]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner size={22} color={colors.onBlue} />
                  <Text style={styles.buttonText}>Entrando</Text>
                </>
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </PressableScale>

            {slow && (
              <Text style={styles.slowNote}>
                El servidor estaba dormido y está despertando. Puede tardar hasta un minuto.
              </Text>
            )}

            <TouchableOpacity
              style={styles.forgot}
              onPress={() => Linking.openURL(FORGOT_PASSWORD_URL)}
              disabled={submitting}>
              <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
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
  title: { fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: 16 },
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
  label: { fontSize: 12, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.controlBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.bg,
    marginBottom: 14,
  },
  inputError: { borderWidth: 2, borderColor: colors.painInk },
  passwordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0, marginBottom: 18 },
  passwordInput: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 13 },
  dimmed: { opacity: 0.6 },
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
  slowNote: { color: colors.inkSecondary, fontSize: 13, textAlign: 'center', marginTop: 12 },
  forgot: { alignItems: 'center', marginTop: 16 },
  forgotText: { color: colors.blue, fontSize: 14, fontWeight: '600' },
});
