import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing } from '../theme';

const LEGEND_KEY = 'whato_seen_legend';
const DISPLAY_MS = 3000;
const FADE_MS = 500;

interface LegendToastProps {
  dismissed: boolean;
}

const ROWS: { color: string; label: string }[] = [
  { color: colors.connected, label: 'Swiping' },
  { color: colors.success, label: 'Done' },
  { color: colors.danger, label: 'Disconnected' },
];

export function LegendToast({ dismissed }: LegendToastProps) {
  const [visible, setVisible] = useState(false);
  const opacity = useSharedValue(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = (delayMs: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), delayMs);
  };

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(LEGEND_KEY).then((val) => {
      if (!mounted) return;
      if (val) {
        setVisible(false);
      } else {
        setVisible(true);
        AsyncStorage.setItem(LEGEND_KEY, 'true');
        opacity.value = withDelay(DISPLAY_MS, withTiming(0, { duration: FADE_MS }));
        scheduleHide(DISPLAY_MS + FADE_MS);
      }
    });
    return () => {
      mounted = false;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (dismissed && visible) {
      opacity.value = withTiming(0, { duration: 200 });
      scheduleHide(200);
    }
  }, [dismissed]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      {ROWS.map(({ color, label }) => (
        <View key={label} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(45,45,45,0.9)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 100,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    color: '#FFFFFF',
  },
});
