import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

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
    >
      <Text style={styles.icon}>!</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  icon: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSecondary,
    marginTop: -1,
  },
});
