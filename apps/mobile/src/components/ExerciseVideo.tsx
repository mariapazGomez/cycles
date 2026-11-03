import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { hasSeenVideoHint, markVideoHintSeen } from '../services/hintStorage';
import { Icon } from './Icon';
import { colors } from '../theme/colors';

// El video de un ejercicio nunca se muestra solo: se ofrece como un botón y se
// abre afuera de la app (YouTube, Safari…). Solo se aceptan enlaces https.
export function playableUrl(videoUrl: string | null | undefined): string | null {
  return videoUrl && /^https:\/\/\S+$/i.test(videoUrl) ? videoUrl : null;
}

// Controla el aviso de la primera vez. `enabled` es false cuando la pantalla no
// tiene video que ofrecer, para no gastar el aviso donde no hay botón.
export function useVideoHint(enabled: boolean) {
  const [seen, setSeen] = useState(true);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;
    hasSeenVideoHint().then(value => {
      if (active) {
        setSeen(value);
      }
    });
    return () => {
      active = false;
    };
  }, [enabled]);

  const dismiss = useCallback(() => {
    setSeen(true);
    markVideoHintSeen();
  }, []);

  return { visible: enabled && !seen, dismiss };
}

interface ButtonProps {
  videoUrl: string;
  exerciseName: string;
  // Se llama al tocar: la pantalla usa esto para dar por visto el aviso.
  onOpen?: () => void;
}

export function ExerciseVideoButton({ videoUrl, exerciseName, onOpen }: ButtonProps) {
  const open = async () => {
    onOpen?.();
    try {
      await Linking.openURL(videoUrl);
    } catch {
      Alert.alert('No se pudo abrir el video', 'Revisa tu conexión e inténtalo de nuevo.');
    }
  };
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={open}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityLabel={`Ver ejemplo de ${exerciseName}`}>
      <Icon name="video" size={20} color={colors.blue} />
    </TouchableOpacity>
  );
}

export function VideoHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={styles.hint} accessible accessibilityLabel="Aviso: puedes ver un ejemplo en video de este ejercicio">
      <Text style={styles.hintTitle}>Ejemplo en video</Text>
      <Text style={styles.hintText}>
        Cuando un ejercicio tenga video, verás este ícono. Tócalo para ver cómo se hace; se abre aparte y no
        interrumpe tu entrenamiento.
      </Text>
      <TouchableOpacity style={styles.hintButton} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Entendido">
        <Text style={styles.hintButtonText}>Entendido</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    backgroundColor: colors.blueTint,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  hintTitle: { fontSize: 13, fontWeight: '700', color: colors.blue, marginBottom: 4 },
  hintText: { fontSize: 14, lineHeight: 20, color: colors.ink },
  hintButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4, marginTop: 4 },
  hintButtonText: { fontSize: 14, fontWeight: '700', color: colors.blue },
});
