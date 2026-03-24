import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { CardItem } from '../providers/types';
import { SwipeCard } from './SwipeCard';
import { colors, spacing, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface SwipeDeckProps {
  cards: CardItem[];
  onSwipeRight: (card: CardItem) => void;
  onSwipeLeft: (card: CardItem) => void;
  onEmpty: () => void;
  onTap?: (card: CardItem) => void;
}

export function SwipeDeck({ cards, onSwipeRight, onSwipeLeft, onEmpty, onTap }: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  const currentCard = cards[currentIndex];
  const nextCard = cards[currentIndex + 1];

  useEffect(() => {
    setCurrentIndex(0);
    currentIndexRef.current = 0;
  }, [cards]);

  const emptyFiredRef = useRef(false);

  useEffect(() => {
    // Reset when cards change (new round)
    emptyFiredRef.current = false;
  }, [cards]);

  useEffect(() => {
    if (currentIndex >= cards.length && !emptyFiredRef.current) {
      emptyFiredRef.current = true;
      onEmpty();
    } else if (currentIndex < cards.length) {
      // Show card after React renders the new card (prevents blink)
      cardOpacity.value = 1;
    }
  }, [currentIndex, cards.length, onEmpty]);

  // Note: empty cards from API errors are handled by useCards setting an error state.
  // This component only handles the case where the user swiped through all cards.

  const advanceCard = useCallback(
    (direction: 'left' | 'right') => {
      const card = cards[currentIndexRef.current];
      if (!card) return;

      if (direction === 'right') {
        onSwipeRight(card);
      } else {
        onSwipeLeft(card);
      }
      cardOpacity.value = 0;
      translateX.value = 0;
      translateY.value = 0;
      currentIndexRef.current += 1;
      setCurrentIndex((i) => i + 1);
    },
    [cards, onSwipeRight, onSwipeLeft, translateX, translateY, cardOpacity]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        translateX.value = withTiming(
          direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH,
          { duration: 200 },
          () => runOnJS(advanceCard)(direction)
        );
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    const card = cards[currentIndexRef.current];
    if (onTap && card) {
      runOnJS(onTap)(card);
    }
  });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          [-15, 0, 15]
        )}deg`,
      },
    ],
  }));

  const overlayLeftStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const overlayRightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const cardTintLeftStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [0.3, 0], Extrapolation.CLAMP),
  }));

  const cardTintRightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 0.3], Extrapolation.CLAMP),
  }));

  if (!currentCard) {
    return (
      <View style={styles.empty}>
        <Text style={typography.body}>No more cards!</Text>
        <Text
          style={[typography.caption, styles.backLink]}
          onPress={onEmpty}
        >
          ← Back to home
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {nextCard && (
        <View style={[styles.cardContainer, { zIndex: 0 }]}>
          <SwipeCard card={nextCard} />
        </View>
      )}

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.cardContainer, { zIndex: 1 }, animatedStyle]}>
          <SwipeCard card={currentCard} />
          <Animated.View style={[styles.cardTint, styles.cardTintRed, cardTintLeftStyle]} pointerEvents="none" />
          <Animated.View style={[styles.cardTint, styles.cardTintGreen, cardTintRightStyle]} pointerEvents="none" />
          <Animated.View style={[styles.overlay, styles.overlayLeft, overlayLeftStyle]}>
            <Text style={styles.overlayLeftText}>NOPE</Text>
          </Animated.View>
          <Animated.View style={[styles.overlay, styles.overlayRight, overlayRightStyle]}>
            <Text style={styles.overlayRightText}>YES!</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    position: 'absolute',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backLink: {
    marginTop: spacing.lg,
    color: colors.primary,
  },
  overlay: {
    position: 'absolute',
    top: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 4,
  },
  overlayLeft: {
    right: spacing.lg,
    borderColor: '#FF4444',
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
  },
  overlayRight: {
    left: spacing.lg,
    borderColor: colors.success,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  overlayLeftText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF4444',
  },
  overlayRightText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#4CAF50',
  },
  cardTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  cardTintRed: {
    backgroundColor: '#FF4444',
  },
  cardTintGreen: {
    backgroundColor: '#4CAF50',
  },
});
