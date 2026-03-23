import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, cardStyle } from '../theme';

interface TopicButtonProps {
  label: string;
  color: string;
  icon: React.ComponentType<any>;
  onPress: () => void;
}

export function TopicButton({ label, color, icon: IconComponent, onPress }: TopicButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, { borderLeftColor: color, borderLeftWidth: 4 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {IconComponent && (
        <IconComponent size={28} color={color} weight="fill" style={{ marginRight: 12 }} />
      )}
      <Text style={[styles.label, { color }]}>{label}</Text>
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
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  label: {
    ...typography.subtitle,
    fontWeight: '700',
    fontSize: 22,
  },
});
