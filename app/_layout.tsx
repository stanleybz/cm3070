import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { colors } from './theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Task Manager',
        }}
      />
      <Stack.Screen
        name="team-dashboard"
        options={{
          title: 'Team Dashboard',
        }}
      />
    </Stack>
  );
}
