import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  Dimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '../theme';
import { CardItem, Topic } from '../providers/types';
import { StarRating } from './StarRating';

interface CardDetailProps {
  card: CardItem;
  visible: boolean;
  onClose: () => void;
  topic: Topic;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.15; // 15% of screen = dismiss

function getActionButtons(card: CardItem, topic: Topic): { label: string; url: string }[] {
  const buttons: { label: string; url: string }[] = [];

  if (card.sourceUrl) {
    const sourceLabel = topic === 'food'
      ? (card.meta?.source === 'google' ? 'View on Google Maps' : 'View on Yelp')
      : (topic === 'movie' ? 'View on TMDB' : 'View on TMDB');
    buttons.push({ label: sourceLabel, url: card.sourceUrl });
  }

  if (topic === 'food') {
    const encodedName = encodeURIComponent(card.title);
    buttons.push({
      label: 'Get Directions',
      url: `https://www.google.com/maps/search/?api=1&query=${encodedName}`,
    });
    buttons.push({
      label: 'Search for Menu',
      url: `https://www.google.com/search?q=${encodedName}+menu`,
    });
  }

  if (topic === 'movie' || topic === 'show') {
    const tmdbId = card.meta?.tmdbId;
    const type = topic === 'movie' ? 'movie' : 'tv';
    if (tmdbId) {
      buttons.push({
        label: 'View Trailer',
        url: `https://www.themoviedb.org/${type}/${tmdbId}/videos`,
      });
      buttons.push({
        label: 'View Reviews',
        url: `https://www.themoviedb.org/${type}/${tmdbId}/reviews`,
      });
    }
    const encodedTitle = encodeURIComponent(card.title);
    buttons.push({
      label: 'Where to Watch',
      url: `https://www.google.com/search?q=${encodedTitle}+streaming`,
    });
  }

  return buttons;
}

export function CardDetail({ card, visible, onClose, topic }: CardDetailProps) {
  const translateY = useSharedValue(0);

  const dismiss = () => onClose();

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Only allow dragging downward
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 500) {
        // Dismiss: slide off screen
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 }, () => {
          runOnJS(dismiss)();
        });
      } else {
        // Snap back
        translateY.value = withTiming(0, { duration: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Reset position when modal opens
  React.useEffect(() => {
    if (visible) {
      translateY.value = 0;
    }
  }, [visible, translateY]);

  if (!visible) return null;

  const overview = card.meta?.overview as string | undefined;
  const actions = getActionButtons(card, topic);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.container, animatedStyle]}>
            {/* Drag handle */}
            <View style={styles.handleBar}>
              <View style={styles.handle} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
              {card.imageUrl && (
                <Image source={{ uri: card.imageUrl }} style={styles.image} />
              )}

              <View style={styles.content}>
                <Text style={styles.title}>{card.title}</Text>
                <Text style={styles.subtitle}>{card.subtitle}</Text>

                {card.rating != null && (
                  <View style={styles.ratingRow}>
                    <StarRating rating={card.rating} size={22} />
                    <Text style={styles.ratingNumber}>{card.rating.toFixed(1)}</Text>
                  </View>
                )}

                {card.details.length > 0 && (
                  <View style={styles.detailsSection}>
                    {card.details.map((d, i) => (
                      <Text key={i} style={styles.detail}>{d}</Text>
                    ))}
                  </View>
                )}

                {overview && (
                  <View style={styles.overviewSection}>
                    <Text style={styles.sectionTitle}>Overview</Text>
                    <Text style={styles.overviewText}>{overview}</Text>
                  </View>
                )}

                <View style={styles.actionsSection}>
                  {actions.map((action) => (
                    <TouchableOpacity
                      key={action.label}
                      style={styles.actionButton}
                      onPress={() => Linking.openURL(action.url)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.actionText}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>← Back to swiping</Text>
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: SCREEN_HEIGHT * 0.9,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D0D0D0',
  },
  scroll: {
    paddingBottom: spacing.md,
  },
  image: {
    width: '100%',
    height: 250,
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    fontSize: 26,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ratingNumber: {
    ...typography.body,
    color: colors.secondary,
    fontWeight: '600',
  },
  detailsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  detail: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  overviewSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  overviewText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  actionsSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  closeText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
