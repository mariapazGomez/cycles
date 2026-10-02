import React from 'react';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../store/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { SummaryScreen } from '../screens/SummaryScreen';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { Spinner } from '../components/Spinner';
import { ExerciseLogScreen } from '../screens/ExerciseLogScreen';
import { SessionFeedbackScreen } from '../screens/SessionFeedbackScreen';
import { SessionDetailScreen } from '../screens/SessionDetailScreen';
import type { AppStackParamList, TabParamList } from './types';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<AppStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Las pestañas viven dentro de la pila: así el registro de serie y el cierre
// de sesión se abren a pantalla completa, sin la isla.
function Tabs() {
  return (
    <Tab.Navigator
      initialRouteName="Today"
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Summary" component={SummaryScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <Spinner size={44} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {status === 'signedOut' ? (
        <LoginScreen />
      ) : (
        <Stack.Navigator screenOptions={{ headerTintColor: colors.blue }}>
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="ExerciseLog"
            component={ExerciseLogScreen}
            options={{ title: '' }}
          />
          <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ title: '' }} />
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
