import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { colors } from '../src/theme';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    function handleUrl(event: { url: string }) {
      const parsed = Linking.parse(event.url);
      // URL format: whato://join/WHATO-7K3M → parsed.path = "join/WHATO-7K3M"
      if (parsed.path?.startsWith('join/')) {
        const code = parsed.path.split('/')[1];
        if (code) {
          router.push({
            pathname: '/join',
            params: { code },
          });
        }
      }
    }

    const subscription = Linking.addEventListener('url', handleUrl);

    // Handle initial URL (app opened from deep link)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      />
    </GestureHandlerRootView>
  );
}
