import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import { warmUpChallengeAudio } from './src/challengeAudio';
import HomeScreen from './src/screens/HomeScreen';
import ChallengeScreen from './src/screens/ChallengeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ImportScreen from './src/screens/ImportScreen';
import type { RootStackParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#e2b714',
    background: '#16161a',
    card: '#16161a',
    text: '#fff',
    border: '#1a1a1a',
    notification: '#e2b714',
  },
};

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.overflow = 'auto';
    }
    warmUpChallengeAudio();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#16213e' },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontSize: 18,
              color: '#fff',
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Challenge"
            component={ChallengeScreen}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Import"
            component={ImportScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
