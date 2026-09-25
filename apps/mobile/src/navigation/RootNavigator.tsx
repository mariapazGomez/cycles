import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../store/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { ExerciseLogScreen } from '../screens/ExerciseLogScreen';
import { SessionFeedbackScreen } from '../screens/SessionFeedbackScreen';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066ee" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {status === 'signedOut' ? (
        <LoginScreen />
      ) : (
        <Stack.Navigator screenOptions={{ headerTintColor: '#0066ee' }}>
          <Stack.Screen name="Today" component={TodayScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="ExerciseLog"
            component={ExerciseLogScreen}
            options={{ title: '' }}
          />
          <Stack.Screen
            name="SessionFeedback"
            component={SessionFeedbackScreen}
            options={{ title: '', presentation: 'modal' }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
