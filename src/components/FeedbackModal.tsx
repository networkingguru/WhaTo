import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { trackFeedbackLinkTapped } from '../services/analytics';

const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSc9zaITCo977EECID7TSLL2B2J33AAGuL6wZu0nkpgErMeZPg/viewform';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  function openForm(type: 'Bug' | 'Feature') {
    trackFeedbackLinkTapped();
    // pre-select the Type field via URL param (entry ID filled in after form creation)
    const typeValue = type === 'Bug' ? 'Bug+Report' : 'Feature+Request';
    Linking.openURL(`${FORM_URL}?entry.1372637109=${typeValue}`);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Feedback</Text>
          <Text style={styles.subtitle}>Help us improve WhaTo</Text>

          <TouchableOpacity style={styles.option} onPress={() => openForm('Bug')}>
            <Text style={styles.optionIcon}>🐛</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Report a Bug</Text>
              <Text style={styles.optionDesc}>Something isn't working right</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={() => openForm('Feature')}>
            <Text style={styles.optionIcon}>💡</Text>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Request a Feature</Text>
              <Text style={styles.optionDesc}>Tell us what you'd like to see</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.subtitle,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  optionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
