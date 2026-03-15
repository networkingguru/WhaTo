import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import {
  Topic,
  FOOD_CATEGORIES,
  MOVIE_GENRES,
  SHOW_GENRES,
} from '../providers/types';

export interface FoodFilters {
  openNow: boolean;
  categories: string[];
  sortBy: 'best_match' | 'distance' | 'rating';
}

export interface MediaFilters {
  genreIds: number[];
  sortTmdb: 'popularity' | 'rating';
}

interface SearchOptionsProps {
  topic: Topic;
  visible: boolean;
  onClose: () => void;
  foodFilters: FoodFilters;
  mediaFilters: MediaFilters;
  onApplyFood: (filters: FoodFilters) => void;
  onApplyMedia: (filters: MediaFilters) => void;
}

export function SearchOptions({
  topic,
  visible,
  onClose,
  foodFilters,
  mediaFilters,
  onApplyFood,
  onApplyMedia,
}: SearchOptionsProps) {
  // Local state for editing
  const [localFood, setLocalFood] = useState<FoodFilters>(foodFilters);
  const [localMedia, setLocalMedia] = useState<MediaFilters>(mediaFilters);

  // Reset local state when modal opens
  React.useEffect(() => {
    if (visible) {
      setLocalFood(foodFilters);
      setLocalMedia(mediaFilters);
    }
  }, [visible, foodFilters, mediaFilters]);

  function handleApply() {
    if (topic === 'food') {
      onApplyFood(localFood);
    } else {
      onApplyMedia(localMedia);
    }
    onClose();
  }

  function toggleCategory(alias: string) {
    setLocalFood((prev) => {
      const has = prev.categories.includes(alias);
      return {
        ...prev,
        categories: has
          ? prev.categories.filter((c) => c !== alias)
          : [...prev.categories, alias],
      };
    });
  }

  function toggleGenre(id: number) {
    setLocalMedia((prev) => {
      const has = prev.genreIds.includes(id);
      return {
        ...prev,
        genreIds: has
          ? prev.genreIds.filter((g) => g !== id)
          : [...prev.genreIds, id],
      };
    });
  }

  const allCatsSelected = localFood.categories.length === 0;
  const allGenresSelected = localMedia.genreIds.length === 0;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Options</Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {topic === 'food' && (
              <>
                {/* Open Now */}
                <View style={styles.row}>
                  <Text style={styles.label}>Open Now</Text>
                  <Switch
                    value={localFood.openNow}
                    onValueChange={(v) =>
                      setLocalFood((p) => ({ ...p, openNow: v }))
                    }
                    trackColor={{ true: colors.primary, false: '#ccc' }}
                  />
                </View>

                {/* Sort By */}
                <Text style={styles.sectionTitle}>Sort By</Text>
                <View style={styles.chipRow}>
                  {(['best_match', 'distance', 'rating'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.chip,
                        localFood.sortBy === s && styles.chipActive,
                      ]}
                      onPress={() =>
                        setLocalFood((p) => ({ ...p, sortBy: s }))
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          localFood.sortBy === s && styles.chipTextActive,
                        ]}
                      >
                        {s === 'best_match'
                          ? 'Best Match'
                          : s === 'distance'
                          ? 'Distance'
                          : 'Rating'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Categories */}
                <Text style={styles.sectionTitle}>Cuisine Type</Text>
                <TouchableOpacity
                  style={[styles.chip, allCatsSelected && styles.chipActive]}
                  onPress={() => setLocalFood((p) => ({ ...p, categories: [] }))}
                >
                  <Text
                    style={[
                      styles.chipText,
                      allCatsSelected && styles.chipTextActive,
                    ]}
                  >
                    All Types
                  </Text>
                </TouchableOpacity>
                <View style={styles.chipRow}>
                  {FOOD_CATEGORIES.map((cat) => {
                    const selected =
                      allCatsSelected || localFood.categories.includes(cat.alias);
                    return (
                      <TouchableOpacity
                        key={cat.alias}
                        style={[styles.chip, selected && styles.chipActive]}
                        onPress={() => toggleCategory(cat.alias)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextActive,
                          ]}
                        >
                          {cat.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {(topic === 'movie' || topic === 'show') && (
              <>
                {/* Sort */}
                <Text style={styles.sectionTitle}>Sort By</Text>
                <View style={styles.chipRow}>
                  {(['popularity', 'rating'] as const).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.chip,
                        localMedia.sortTmdb === s && styles.chipActive,
                      ]}
                      onPress={() =>
                        setLocalMedia((p) => ({ ...p, sortTmdb: s }))
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          localMedia.sortTmdb === s && styles.chipTextActive,
                        ]}
                      >
                        {s === 'popularity' ? 'Trending' : 'Highest Rated'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Genres */}
                <Text style={styles.sectionTitle}>Genres</Text>
                <TouchableOpacity
                  style={[styles.chip, allGenresSelected && styles.chipActive]}
                  onPress={() =>
                    setLocalMedia((p) => ({ ...p, genreIds: [] }))
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      allGenresSelected && styles.chipTextActive,
                    ]}
                  >
                    All Genres
                  </Text>
                </TouchableOpacity>
                <View style={styles.chipRow}>
                  {(topic === 'movie' ? MOVIE_GENRES : SHOW_GENRES).map(
                    (genre) => {
                      const selected =
                        allGenresSelected ||
                        localMedia.genreIds.includes(genre.id);
                      return (
                        <TouchableOpacity
                          key={genre.id}
                          style={[styles.chip, selected && styles.chipActive]}
                          onPress={() => toggleGenre(genre.id)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              selected && styles.chipTextActive,
                            ]}
                          >
                            {genre.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: spacing.lg,
  },
  title: {
    ...typography.subtitle,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.body,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.background,
    marginBottom: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  applyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
