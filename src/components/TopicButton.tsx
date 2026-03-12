import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, cardStyle } from '../theme';

interface TopicButtonProps {
  label: string;
  emoji: string;
  onPress: () => void;
}

export function TopicButton({ label, emoji, onPress }: TopicButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface,
    ...cardStyle,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.subtitle,
  },
});
