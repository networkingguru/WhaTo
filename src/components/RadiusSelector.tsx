import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

const RADIUS_OPTIONS = [1, 5, 10, 25];

interface RadiusSelectorProps {
  selected: number;
  onSelect: (radius: number) => void;
}

export function RadiusSelector({ selected, onSelect }: RadiusSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Search radius</Text>
      <View style={styles.options}>
        {RADIUS_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.pill, selected === r && styles.pillSelected]}
            onPress={() => onSelect(r)}
          >
            <Text style={[styles.pillText, selected === r && styles.pillTextSelected]}>
              {r} mi
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  options: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
