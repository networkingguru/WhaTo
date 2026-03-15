import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ForkKnife, FilmSlate, Television } from 'phosphor-react-native';
import { colors, spacing, typography, cardStyle } from '../theme';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  ForkKnife,
  FilmSlate,
  Television,
};

interface TopicButtonProps {
  label: string;
  color: string;
  icon: string;
  onPress: () => void;
}

export function TopicButton({ label, color, icon, onPress }: TopicButtonProps) {
  const IconComponent = ICON_MAP[icon];
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
