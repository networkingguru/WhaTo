import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface SupportPanelProps {
  visible: boolean;
  onClose: () => void;
}

const LINKS = [
  { label: 'Check out my books', url: 'https://www.amazon.com/stores/Brian-Hill/author/B001IXMPBK' },
  { label: 'Listen to the podcast', url: 'https://finguptheineffable.podbean.com' },
  { label: 'Buy me a coffee', url: 'https://patreon.com/NetworkingGuru?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink' },
  { label: 'Watch me on YouTube', url: 'https://youtube.com/@brianondrumsyt?si=feBQ_mEwWGHRdNli' },
  { label: 'Rate & share the app', url: 'store-review' },
];

export function SupportPanel({ visible, onClose }: SupportPanelProps) {
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
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.message}>
            I made this app because I was sick of this problem. I don't collect
            your data, no ads. But if you'd like to help me out...
          </Text>

          {LINKS.map((link) => (
            <TouchableOpacity
              key={link.label}
              style={styles.linkButton}
              onPress={() => handleLink(link.url)}
            >
              <Text style={styles.linkText}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing.sm,
  },
  closeText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  message: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  linkButton: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  linkText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
