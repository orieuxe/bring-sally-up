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
import { COLORS } from './src/theme';
import { ACCENT } from './src/utils/color';

const Stack = createStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: ACCENT,
    background: COLORS.bg,
    card: COLORS.bg,
    text: COLORS.text,
    border: COLORS.emptyCell,
    notification: ACCENT,
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
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
          />
          <Stack.Screen
            name="Challenge"
            component={ChallengeScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
          />
          <Stack.Screen
            name="Import"
            component={ImportScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
