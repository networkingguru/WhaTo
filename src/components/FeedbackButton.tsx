import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme';

interface FeedbackButtonProps {
  onPress: () => void;
}

export function FeedbackButton({ onPress }: FeedbackButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      testID="feedback-button"
      activeOpacity={0.7}
      style={styles.button}
      hitSlop={12}
    >
      <Text style={styles.label}>Report a problem</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.6,
    textDecorationLine: 'underline',
  },
});
