import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

interface LogoProps {
  size?: 'large' | 'small';
}

export function Logo({ size = 'large' }: LogoProps) {
  const isSmall = size === 'small';
  const fontSize = isSmall ? 24 : 42;
  const paddingH = isSmall ? 16 : 32;
  const paddingV = isSmall ? 8 : 16;
  const tailSize = isSmall ? 8 : 14;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bubble, { paddingHorizontal: paddingH, paddingVertical: paddingV }]}
      >
        <Text style={[styles.text, { fontSize }]}>
          <Text style={styles.wha}>Wha</Text>
          <Text style={styles.to}>To</Text>
          <Text style={styles.question}>?</Text>
        </Text>
        <View
          style={[
            styles.tail,
            {
              borderLeftWidth: tailSize,
              borderRightWidth: tailSize,
              borderTopWidth: tailSize,
            },
          ]}
        />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  bubble: {
    borderRadius: 28,
    overflow: 'visible',
    position: 'relative',
  },
  text: {
    fontWeight: '800',
  },
  wha: {
    color: '#FFFFFF',
  },
  to: {
    color: colors.text,
  },
  question: {
    color: '#FFFFFF',
  },
  tail: {
    position: 'absolute',
    bottom: -12,
    left: 30,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.secondary,
    borderStyle: 'solid',
  },
});
