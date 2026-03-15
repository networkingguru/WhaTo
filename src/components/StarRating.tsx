import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star, StarHalf } from 'phosphor-react-native';

interface StarRatingProps {
  rating: number | null;
  size?: number;
  color?: string;
}

export function StarRating({ rating, size = 16, color = '#F5A623' }: StarRatingProps) {
  if (rating == null) return null;

  const clamped = Math.max(0, Math.min(5, rating));
  const fullStars = Math.floor(clamped);
  const hasHalf = clamped - fullStars >= 0.25 && clamped - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <View style={styles.container}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`f${i}`} testID="star-filled" size={size} color={color} weight="fill" />
      ))}
      {hasHalf && (
        <StarHalf testID="star-half" size={size} color={color} weight="fill" />
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`e${i}`} testID="star-empty" size={size} color={color} weight="regular" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
