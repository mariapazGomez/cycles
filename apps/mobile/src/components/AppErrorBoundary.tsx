import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { reportError } from '../services/crashReporting';
import { colors } from '../theme/colors';

interface State {
  failed: boolean;
}

// Red de seguridad de toda la app: si una pantalla falla al dibujarse, en vez
// de quedar en blanco se muestra este aviso con una salida, y el error se
// registra (sin datos de la persona) para poder corregirlo.
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, info.componentStack);
  }

  private retry = () => this.setState({ failed: false });

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <View style={styles.container} accessibilityRole="alert">
        <Text style={styles.title} accessibilityRole="header">
          Algo salió mal
        </Text>
        <Text style={styles.text}>Tuvimos un problema al mostrar esta pantalla. Toca Reintentar para volver.</Text>
        <TouchableOpacity style={styles.button} onPress={this.retry} accessibilityRole="button" accessibilityLabel="Reintentar">
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgApp, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  text: { fontSize: 16, lineHeight: 22, color: colors.inkSecondary, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  button: {
    minHeight: 52,
    minWidth: 180,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '700', color: colors.onBlue },
});
