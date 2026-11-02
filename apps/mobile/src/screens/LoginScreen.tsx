import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppleButton } from '@invertase/react-native-apple-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../store/AuthContext';
import { ApiError } from '../services/httpClient';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { Spinner } from '../components/Spinner';
import { FloatingField } from '../components/login/FloatingField';
import { LoginCurtain } from '../components/login/LoginCurtain';
import { LoginHero } from '../components/login/LoginHero';
import { loginMetrics } from '../components/login/layout';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { colors } from '../theme/colors';
import { primaryShadow } from '../theme/elevation';
import { PRIVACY_URL, REGISTER_URL, TERMS_URL } from '../config/legal';
import { AppleSignInCancelled, isAppleSignInAvailable, requestAppleCredential } from '../services/appleSignIn';

// Si el login tarda más que esto, se avisa que el servidor está despertando.
const SLOW_LOGIN_MS = 6000;
// Hasta que no pasa este tiempo no se muestra la pantalla de carga: un login
// rápido no debe parpadear.
const CURTAIN_DELAY_MS = 600;
// Bloques del formulario que entran uno tras otro.
const REVEALS = 8;

const FORGOT_PASSWORD_URL = 'https://app.getcycles.app/forgot-password';

function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 401) {
    return 'Correo o contraseña incorrectos. Revisa tus datos.';
  }
  return err instanceof Error ? err.message : 'No pudimos iniciar sesión.';
}

export function LoginScreen() {
  const { login, loginWithApple } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const metrics = loginMetrics(width, height);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const [showCurtain, setShowCurtain] = useState(false);
  const [compact, setCompact] = useState(false);
  // Apple entregó una identidad válida pero no hay cuenta: la app no crea cuentas.
  const [noAccount, setNoAccount] = useState(false);
  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const sheetY = useRef(new Animated.Value(reduceMotion ? 0 : height)).current;
  const reveals = useRef(Array.from({ length: REVEALS }, () => new Animated.Value(reduceMotion ? 1 : 0))).current;
  const sheen = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const morph = useRef(new Animated.Value(0)).current;

  // Entrada: la hoja sube con un pequeño rebote y sus bloques aparecen escalonados.
  useEffect(() => {
    if (reduceMotion) {
      sheetY.setValue(0);
      reveals.forEach(v => v.setValue(1));
      return;
    }
    const entrance = Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 0,
        duration: 750,
        delay: 850,
        easing: Easing.bezier(0.2, 1.05, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(1100),
        Animated.stagger(
          80,
          reveals.map(v => Animated.timing(v, { toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true })),
        ),
      ]),
      // Un destello pasa una vez sobre el botón de Apple.
      Animated.sequence([
        Animated.delay(1900),
        Animated.timing(sheen, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [reduceMotion, sheetY, reveals, sheen]);

  // Con el teclado abierto el logo se encoge y el formulario sube.
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setCompact(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setCompact(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (!submitting) {
      setSlow(false);
      setShowCurtain(false);
      return;
    }
    const curtain = setTimeout(() => setShowCurtain(true), CURTAIN_DELAY_MS);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_LOGIN_MS);
    return () => {
      clearTimeout(curtain);
      clearTimeout(slowTimer);
    };
  }, [submitting]);

  // El botón se encoge hasta ser un círculo con el anillo girando.
  useEffect(() => {
    Animated.timing(morph, {
      toValue: submitting ? 1 : 0,
      duration: reduceMotion ? 0 : 350,
      easing: Easing.bezier(0.3, 0.7, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [submitting, reduceMotion, morph]);

  // El formulario tiembla cuando algo sale mal.
  useEffect(() => {
    if (!error || reduceMotion) {
      return;
    }
    Animated.sequence(
      [-7, 7, -7, 7, 0].map(toValue => Animated.timing(shake, { toValue, duration: 80, useNativeDriver: true })),
    ).start();
  }, [error, reduceMotion, shake]);

  const handleSubmit = async () => {
    if (submitting || !email || !password) {
      return;
    }
    setError(null);
    setNoAccount(false);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    if (submitting) {
      return;
    }
    setError(null);
    setNoAccount(false);
    setSubmitting(true);
    try {
      await loginWithApple(await requestAppleCredential());
    } catch (err) {
      if (err instanceof AppleSignInCancelled) {
        return;
      }
      if (err instanceof ApiError && err.code === 'no_account') {
        setNoAccount(true);
      }
      setError(err instanceof Error ? err.message : 'No pudimos iniciar sesión con Apple.');
    } finally {
      setSubmitting(false);
    }
  };

  const reveal = (i: number) => ({
    opacity: reveals[i],
    transform: [{ translateY: reveals[i].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  });

  const contentWidth = Math.min(width, metrics.sheetMaxWidth) - metrics.sheetPadding * 2;
  const buttonWidth = morph.interpolate({ inputRange: [0, 1], outputRange: [contentWidth, metrics.buttonHeight] });
  const labelOpacity = morph.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const idle = !email || !password;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LoginHero metrics={metrics} width={width} compact={compact} reduceMotion={reduceMotion} topInset={insets.top} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }, { translateX: shake }] }]}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              {
                paddingHorizontal: metrics.sheetPadding,
                paddingBottom: insets.bottom + 16,
                maxWidth: metrics.sheetMaxWidth,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.grab} />

            <Animated.Text style={[styles.title, { fontSize: metrics.titleSize, marginBottom: metrics.gap }, reveal(0)]}>
              Entra a tu cuenta
            </Animated.Text>

            {error && (
              <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Icon name="alert" size={18} color={colors.painInk} />
                <Text style={styles.bannerText}>{error}</Text>
              </View>
            )}

            {noAccount && (
              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => Linking.openURL(REGISTER_URL)}
                accessibilityRole="link">
                <Text style={styles.registerLinkText}>Registrarme en la web</Text>
              </TouchableOpacity>
            )}

            {isAppleSignInAvailable && (
              <>
                <Animated.View style={[styles.appleWrap, { height: metrics.controlHeight }, submitting && styles.dimmed, reveal(1)]}>
                  <AppleButton
                    buttonStyle={AppleButton.Style.BLACK}
                    buttonType={AppleButton.Type.CONTINUE}
                    cornerRadius={metrics.controlHeight / 2}
                    style={styles.appleButton}
                    onPress={handleApple}
                  />
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.sheen,
                      {
                        transform: [
                          { translateX: sheen.interpolate({ inputRange: [0, 1], outputRange: [-90, width] }) },
                          { skewX: '-20deg' },
                        ],
                      },
                    ]}
                  />
                </Animated.View>
                <Animated.View style={[styles.orRow, { marginVertical: metrics.gap }, reveal(2)]}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>o</Text>
                  <View style={styles.orLine} />
                </Animated.View>
              </>
            )}

            <Animated.View style={[{ marginBottom: metrics.gap / 1.5 }, reveal(3)]}>
              <FloatingField
                label="Correo"
                icon="mail"
                value={email}
                onChangeText={setEmail}
                height={metrics.controlHeight}
                editable={!submitting}
                error={Boolean(error) && !noAccount}
                keyboardType="email-address"
                textContentType="username"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                reduceMotion={reduceMotion}
              />
            </Animated.View>

            <Animated.View style={[{ marginBottom: metrics.gap }, reveal(4)]}>
              <FloatingField
                ref={passwordRef}
                label="Contraseña"
                icon="lock"
                value={password}
                onChangeText={setPassword}
                height={metrics.controlHeight}
                editable={!submitting}
                error={Boolean(error) && !noAccount}
                secure
                textContentType="password"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                reduceMotion={reduceMotion}
              />
            </Animated.View>

            <Animated.View style={[styles.buttonRow, reveal(5)]}>
              <PressableScale onPress={handleSubmit} disabled={submitting} accessibilityRole="button" accessibilityLabel="Entrar">
                <Animated.View
                  style={[
                    styles.button,
                    primaryShadow,
                    { height: metrics.buttonHeight, borderRadius: metrics.buttonHeight / 2, width: buttonWidth },
                    idle && !submitting && styles.buttonIdle,
                  ]}>
                  <Animated.Text style={[styles.buttonText, { opacity: labelOpacity }]} numberOfLines={1}>
                    Entrar
                  </Animated.Text>
                  {submitting && (
                    <View style={styles.buttonSpinner}>
                      <Spinner size={24} color={colors.onBlue} />
                    </View>
                  )}
                </Animated.View>
              </PressableScale>
            </Animated.View>

            <Animated.View style={[styles.forgotWrap, reveal(6)]}>
              <TouchableOpacity
                style={styles.forgot}
                onPress={() => Linking.openURL(FORGOT_PASSWORD_URL)}
                disabled={submitting}
                accessibilityRole="link">
                <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.legalRow, reveal(7)]}>
              <TouchableOpacity style={styles.legalLink} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
                <Text style={styles.legalText}>Privacidad</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.legalLink} onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
                <Text style={styles.legalText}>Términos de uso</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      <LoginCurtain visible={showCurtain} slow={slow} reduceMotion={reduceMotion} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp },
  flex: { flex: 1 },
  sheet: {
    flex: 1,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    ...Platform.select({
      ios: { shadowColor: colors.blue, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: -8 } },
      default: { elevation: 8 },
    }),
  },
  content: { flexGrow: 1, width: '100%', alignSelf: 'center', paddingTop: 12 },
  grab: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: colors.grayBorder, marginBottom: 12 },
  title: { fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  banner: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.painBg,
    borderWidth: 1,
    borderColor: '#f3b9b9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { flex: 1, color: colors.painInk, fontSize: 13 },
  registerLink: { alignItems: 'center', minHeight: 44, justifyContent: 'center', marginBottom: 8 },
  registerLinkText: { color: colors.blue, fontSize: 15, fontWeight: '700' },
  appleWrap: { borderRadius: 999, overflow: 'hidden', backgroundColor: '#000' },
  appleButton: { width: '100%', height: '100%' },
  sheen: { position: 'absolute', top: 0, bottom: 0, width: 70, backgroundColor: 'rgba(255,255,255,0.28)' },
  dimmed: { opacity: 0.6 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.grayBorder },
  orText: { color: colors.inkSecondary, fontSize: 13 },
  buttonRow: { alignItems: 'center' },
  button: { backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  buttonIdle: { opacity: 0.55 },
  buttonText: { color: colors.onBlue, fontSize: 17, fontWeight: '700' },
  buttonSpinner: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  forgotWrap: { marginTop: 'auto', alignItems: 'center', paddingTop: 12 },
  forgot: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  forgotText: { color: colors.blue, fontSize: 15, fontWeight: '600' },
  legalRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  // Área táctil de al menos 44 px de alto.
  legalLink: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  legalText: { color: colors.inkSecondary, fontSize: 13, textDecorationLine: 'underline' },
});
