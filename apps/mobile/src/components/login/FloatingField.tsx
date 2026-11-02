import React, { forwardRef, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import { Icon, type IconName } from '../Icon';
import { colors } from '../../theme/colors';

interface Props {
  label: string;
  icon: IconName;
  value: string;
  onChangeText: (text: string) => void;
  height: number;
  editable?: boolean;
  error?: boolean;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  reduceMotion?: boolean;
}

// Campo relleno con icono, etiqueta que flota al enfocar o escribir y una línea
// azul que recorre el borde de abajo. La contraseña lleva un ojo para mostrarla.
export const FloatingField = forwardRef<React.ElementRef<typeof TextInput>, Props>(function LoginField(
  {
    label,
    icon,
    value,
    onChangeText,
    height,
    editable = true,
    error = false,
    secure = false,
    keyboardType,
    textContentType,
    autoComplete,
    returnKeyType,
    onSubmitEditing,
    reduceMotion = false,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const floating = focused || value.length > 0;
  const lift = useRef(new Animated.Value(floating ? 1 : 0)).current;
  const line = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    const run = (node: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(node, {
        toValue,
        duration: reduceMotion ? 0 : duration,
        easing: Easing.bezier(0.3, 0.7, 0.2, 1),
        useNativeDriver: false,
      }).start();
    run(lift, floating ? 1 : 0, 200);
    run(line, focused ? 1 : 0, 450);
  }, [floating, focused, lift, line, reduceMotion]);

  const labelTop = lift.interpolate({ inputRange: [0, 1], outputRange: [(height - 18) / 2, 7] });
  const labelSize = lift.interpolate({ inputRange: [0, 1], outputRange: [15, 11.5] });
  const lineWidth = line.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const accent = error ? colors.painInk : focused ? colors.blue : colors.inkSecondary;

  return (
    <View
      style={[
        styles.field,
        { height },
        floating && styles.fieldFilled,
        focused && styles.fieldFocused,
        error && styles.fieldError,
      ]}>
      <View style={styles.icon}>
        <Icon name={icon} size={18} color={accent} strokeWidth={1.8} />
      </View>
      <Animated.Text
        pointerEvents="none"
        style={[styles.label, floating && styles.labelFloating, { top: labelTop, fontSize: labelSize, color: floating ? accent : colors.grayMid }]}>
        {label}
      </Animated.Text>
      <TextInput
        ref={ref}
        style={[styles.input, secure && styles.inputWithEye]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        secureTextEntry={secure && !visible}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboardType}
        textContentType={textContentType}
        autoComplete={autoComplete}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        selectionColor={colors.blue}
      />
      {secure && (
        <Pressable
          style={styles.eye}
          onPress={() => setVisible(v => !v)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          <Icon name={visible ? 'eyeOff' : 'eye'} size={22} color={colors.inkSecondary} />
        </Pressable>
      )}
      <Animated.View style={[styles.line, { width: lineWidth, backgroundColor: error ? colors.painInk : colors.brand }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    borderRadius: 14,
    backgroundColor: colors.grayLight,
    borderWidth: 1.5,
    borderColor: 'transparent',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fieldFilled: { backgroundColor: colors.bg, borderColor: colors.grayBorder },
  fieldFocused: { borderColor: colors.brand, backgroundColor: colors.bg },
  fieldError: { borderColor: colors.painInk },
  icon: { position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center' },
  label: { position: 'absolute', left: 44 },
  labelFloating: { fontWeight: '600' },
  input: { paddingLeft: 44, paddingRight: 14, paddingTop: 14, paddingBottom: 0, fontSize: 16, color: colors.ink, height: '100%' },
  inputWithEye: { paddingRight: 52 },
  eye: { position: 'absolute', right: 6, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
  line: { position: 'absolute', left: 0, bottom: 0, height: 2.5, borderRadius: 2 },
});
