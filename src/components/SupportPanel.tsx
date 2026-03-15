import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, typography } from '../theme';

interface SupportPanelProps {
  visible: boolean;
  onClose: () => void;
}

const LINKS = [
  { label: 'Check out my books', url: 'https://www.amazon.com/stores/Brian-Hill/author/B001IXMPBK', icon: '📚' },
  { label: 'Listen to the podcast', url: 'https://finguptheineffable.podbean.com', icon: '🎙️' },
  { label: 'Buy me a coffee', url: 'https://patreon.com/NetworkingGuru?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink', icon: '☕' },
  { label: 'Watch me on YouTube', url: 'https://youtube.com/@brianondrumsyt?si=feBQ_mEwWGHRdNli', icon: '🎬' },
  { label: 'Rate & share the app', url: 'store-review', icon: '⭐' },
];

const ROLL_DURATION = 500;

export function SupportPanel({ visible, onClose }: SupportPanelProps) {
  const scaleY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, { duration: 200 });
      scaleY.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.05)) });
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [visible, scaleY, opacity, backdropOpacity]);

  const handleRollUp = useCallback(() => {
    opacity.value = withTiming(0.3, { duration: ROLL_DURATION });
    backdropOpacity.value = withTiming(0, { duration: ROLL_DURATION });
    scaleY.value = withTiming(
      0,
      { duration: ROLL_DURATION, easing: Easing.in(Easing.back(1.1)) },
      () => runOnJS(onClose)()
    );
  }, [scaleY, opacity, backdropOpacity, onClose]);

  const scrollAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
    opacity: opacity.value,
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0,0,0,${0.7 * backdropOpacity.value})`,
  }));

  if (!visible) return null;

  async function handleLink(url: string) {
    if (url === 'store-review') {
      try {
        const StoreReview = require('expo-store-review');
        if (await StoreReview.hasAction()) {
          await StoreReview.requestReview();
        }
      } catch {
        // Silently fail if store review is not available
      }
    } else if (url) {
      Linking.openURL(url);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Animated.View style={[styles.scrollOuter, scrollAnimatedStyle]}>
          <View style={styles.scrollInner}>
            <LinearGradient
              colors={['#F5A623', '#FF6B4A', '#F5A623']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.headerGradient}
            >
              <Text style={styles.headerText}>✨ A Humble Request ✨</Text>
            </LinearGradient>

            <ScrollView
              style={styles.contentScroll}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.ornamentTop}>━━━ ✦ ━━━</Text>

              <Text style={styles.message}>
                I made this app because I was sick of this problem. I don't collect
                your data, no ads, no tracking. Just a thing I built because I
                needed it.
              </Text>
              <Text style={styles.message}>
                If it made your life a little easier, and you'd like to throw some
                good vibes my way...
              </Text>

              <Text style={styles.ornamentMid}>~ ✦ ~</Text>

              {LINKS.map((link) => (
                <TouchableOpacity
                  key={link.label}
                  style={styles.linkButton}
                  onPress={() => handleLink(link.url)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkIcon}>{link.icon}</Text>
                  <Text style={styles.linkText}>{link.label}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.ornamentBottom}>━━━ ✦ ━━━</Text>

              <Text style={styles.footer}>
                Made with ❤️ and too much coffee{'\n'}by a guy who just wanted to
                pick a restaurant
              </Text>
            </ScrollView>

            <TouchableOpacity style={styles.closeButton} onPress={handleRollUp}>
              <Text style={styles.closeText}>Roll up the scroll</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  scrollOuter: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    width: '100%',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#D4A44C',
    backgroundColor: '#D4A44C',
    padding: 3,
  },
  scrollInner: {
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#B8860B',
    backgroundColor: '#FFF8EC',
    overflow: 'hidden',
  },
  headerGradient: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  contentScroll: {
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  contentContainer: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },
  ornamentTop: {
    textAlign: 'center',
    color: '#D4A44C',
    fontSize: 18,
    marginBottom: spacing.md,
    letterSpacing: 4,
  },
  ornamentMid: {
    textAlign: 'center',
    color: '#D4A44C',
    fontSize: 16,
    marginVertical: spacing.md,
    letterSpacing: 6,
  },
  ornamentBottom: {
    textAlign: 'center',
    color: '#D4A44C',
    fontSize: 18,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    letterSpacing: 4,
  },
  message: {
    ...typography.body,
    color: '#4A3728',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1D6',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: '#D4A44C',
  },
  linkIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  linkText: {
    ...typography.body,
    color: '#8B6914',
    fontWeight: '600',
    flex: 1,
  },
  footer: {
    ...typography.caption,
    color: '#A0876A',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#D4A44C',
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  closeText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
