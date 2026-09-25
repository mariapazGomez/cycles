import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TodaySession } from '@cycles/shared';
import { fetchToday } from '../services/executionApi';
import { useAuth } from '../store/AuthContext';
import type { AppStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Today'>;

export function TodayScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [data, setData] = useState<TodaySession | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchToday());
    } catch {
      setError('No pudimos cargar tu entrenamiento. Desliza para reintentar.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (data === undefined && !error) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066ee" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <Text style={styles.title}>Hoy</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logout}>Salir</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {data === null && !error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No tienes ninguna sesión pendiente.</Text>
        </View>
      )}

      {data && (
        <>
          <Text style={styles.cycleName}>
            {data.cycle.name} · Semana {data.cycle.currentWeek}
          </Text>
          <Text style={styles.sessionName}>{data.session.name}</Text>

          {data.session.sessionExercises.map(sessionExercise => {
            const loggedSets = sessionExercise.logs.length;
            return (
              <TouchableOpacity
                key={sessionExercise.id}
                style={styles.exerciseCard}
                onPress={() => navigation.navigate('ExerciseLog', { sessionExercise })}>
                <View style={styles.exerciseRow}>
                  <Text style={styles.exerciseName}>{sessionExercise.exercise.name}</Text>
                  <Text style={styles.exerciseProgress}>
                    {loggedSets}/{sessionExercise.targetSets}
                  </Text>
                </View>
                <Text style={styles.exerciseTarget}>
                  {sessionExercise.targetSets} series × {sessionExercise.targetReps} reps
                  {sessionExercise.targetWeight ? ` · ${sessionExercise.targetWeight} kg` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() =>
              navigation.navigate('SessionFeedback', {
                sessionId: data.session.id,
                startedAt: data.session.startedAt,
              })
            }>
            <Text style={styles.closeButtonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2228',
  },
  logout: {
    color: '#0066ee',
    fontSize: 15,
  },
  error: {
    color: '#d0342c',
    marginBottom: 16,
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b6b70',
    textAlign: 'center',
  },
  cycleName: {
    fontSize: 14,
    color: '#6b6b70',
    marginTop: 12,
  },
  sessionName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1f2228',
    marginBottom: 20,
  },
  exerciseCard: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2228',
  },
  exerciseProgress: {
    fontSize: 15,
    color: '#0066ee',
    fontWeight: '600',
  },
  exerciseTarget: {
    fontSize: 14,
    color: '#6b6b70',
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: '#1f2228',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
