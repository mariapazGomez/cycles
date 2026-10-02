/**
 * @format
 */

import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import { RestTimerProvider } from './src/store/RestTimerContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { warmUpApi } from './src/services/httpClient';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    warmUpApi();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AuthProvider>
        <RestTimerProvider>
          <RootNavigator />
        </RestTimerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
