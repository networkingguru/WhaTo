import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { colors } from '../src/theme';
import { trackScreenView } from '../src/services/analytics';
import crashlytics from '@react-native-firebase/crashlytics';

// Class-based error boundary — required pattern for React 19
// (no stable hook-based API for error boundaries exists in React 19)
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    try {
      crashlytics().recordError(error);
    } catch {
      // never let crash reporting crash the app
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 18, color: '#333', textAlign: 'center', paddingHorizontal: 32 }}>
            Something went wrong. Please restart the app.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function ScreenTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackScreenView(pathname);
  }, [pathname]);
  return null;
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    function handleUrl(event: { url: string }) {
      const parsed = Linking.parse(event.url);
      // URL format: whato://join/ABCD → parsed.path = "join/ABCD"
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
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="dark" />
        <ScreenTracker />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        />
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
