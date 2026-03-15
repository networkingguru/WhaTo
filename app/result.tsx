import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, cardStyle } from '../src/theme';

export default function ResultScreen() {
  const params = useLocalSearchParams<{
    title: string;
    subtitle: string;
    imageUrl: string;
    rating: string;
    details: string;
    sourceUrl: string;
    topic: string;
  }>();
  const router = useRouter();

  let details: string[] = [];
  try {
    details = params.details ? JSON.parse(params.details) : [];
  } catch {
    details = [];
  }
  const topicLabels: Record<string, string> = {
    food: 'eat at',
    movie: 'watch',
    show: 'stream',
  };
  const verb = topicLabels[params.topic] ?? 'go with';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>You should {verb}...</Text>

      <View style={styles.card}>
        {params.imageUrl ? (
          <Image source={{ uri: params.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
        <View style={styles.info}>
          <Text style={styles.title}>{params.title}</Text>
          <Text style={styles.subtitle}>{params.subtitle}</Text>
          {params.rating ? (
            <Text style={styles.rating}>Rating: {params.rating}/5</Text>
          ) : null}
          {details.map((d, i) => (
            <Text key={i} style={styles.detail}>{d}</Text>
          ))}
        </View>
      </View>

      {params.sourceUrl ? (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL(params.sourceUrl)}
        >
          <Text style={styles.linkText}>View Details</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.restartButton}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.restartText}>Start Over</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    ...typography.title,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    ...cardStyle,
    overflow: 'hidden',
    width: '100%',
    marginBottom: spacing.xl,
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: colors.accent,
  },
  placeholder: {},
  info: {
    padding: spacing.lg,
  },
  title: {
    ...typography.title,
    fontSize: 28,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  rating: {
    ...typography.body,
    color: colors.primaryLight,
    marginTop: spacing.sm,
  },
  detail: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  linkButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  linkText: {
    ...typography.body,
    fontWeight: '600',
  },
  restartButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
  },
  restartText: {
    ...typography.body,
    fontWeight: '700',
  },
});
