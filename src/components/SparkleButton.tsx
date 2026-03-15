import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkle } from 'phosphor-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

interface SparkleButtonProps {
  onPress: () => void;
}

export function SparkleButton({ onPress }: SparkleButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(
      withDelay(
        30000,
        withSequence(
          withTiming(1.3, { duration: 200 }),
          withTiming(0.9, { duration: 150 }),
          withTiming(1.15, { duration: 150 }),
          withTiming(1, { duration: 200 })
        )
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withDelay(
        30000,
        withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0.6, { duration: 500 })
        )
      ),
      -1,
      false
    );
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <TouchableOpacity onPress={onPress} testID="sparkle-button" activeOpacity={0.7}>
      <Animated.View style={[styles.button, animatedStyle]}>
        <Sparkle size={24} color="#F5A623" weight="fill" />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
