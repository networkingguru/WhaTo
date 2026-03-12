import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { CardItem } from '../providers/types';
import { colors, spacing, typography, cardStyle } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface SwipeCardProps {
  card: CardItem;
}

export function SwipeCard({ card }: SwipeCardProps) {
  return (
    <View style={styles.card}>
      {card.imageUrl ? (
        <Image source={{ uri: card.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {card.title}
          </Text>
          {card.rating != null && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{card.rating}</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>{card.subtitle}</Text>
        {card.details.map((detail, i) => (
          <Text key={i} style={styles.detail}>
            {detail}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.surface,
    ...cardStyle,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '65%',
    backgroundColor: colors.accent,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.caption,
  },
  info: {
    flex: 1,
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.subtitle,
    flex: 1,
    marginRight: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  detail: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  ratingBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ratingText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
});
