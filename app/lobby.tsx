import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SMS from 'expo-sms';
import { colors, spacing, typography } from '../src/theme';
import { topicDisplayNames } from '../src/utils/topicLabels';
import { Topic } from '../src/providers/types';
import {
  listenToSession,
  startSession,
  endSession,
  SessionData,
} from '../src/services/sessionService';
import { trackGroupSessionStarted } from '../src/services/analytics';
import { logError } from '../src/services/crashlytics';
import { Crown } from 'phosphor-react-native';

export default function LobbyScreen() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const params = useLocalSearchParams<{ code: string; topic: string; isCreator: string }>();
  const { code, topic, isCreator } = params;
  const [session, setSession] = useState<SessionData | null>(null);
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (!code) return;
    hasNavigated.current = false;
    const unsub = listenToSession(code, (data) => {
      setSession(data);
      if (hasNavigated.current) return;
      if ((data?.status === 'active' || data?.status === 'complete') && isCreator !== 'true') {
        hasNavigated.current = true;
        routerRef.current.replace({
          pathname: data?.status === 'complete' ? '/group-result' : '/group-swipe',
          params: { code },
        });
      }
    });
    return unsub;
  }, [code, isCreator]);

  const participants = session?.participants ? Object.entries(session.participants) : [];

  const handleInvite = useCallback(async () => {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('SMS not available', 'SMS is not available on this device.');
      return;
    }
    const topicLabel = topicDisplayNames[topic as Topic] ?? topic;
    await SMS.sendSMSAsync([], [
      `WhaTo... ${topicLabel} Join my group: whato://join/${code}`,
      `Don't have WhaTo? Get it on the App Store!`,
    ].join('\n'));
  }, [code, topic]);

  const handleStart = useCallback(async () => {
    if (!code) return;
    try {
      await startSession(code);
      trackGroupSessionStarted(topic as Topic, participants.length);
      router.replace({
        pathname: '/group-swipe',
        params: { code },
      });
    } catch (err) {
      logError(err, 'lobby_start_session');
    }
  }, [code, router, topic, participants.length]);

  const handleCancel = useCallback(async () => {
    if (code && isCreator === 'true') {
      try { await endSession(code); } catch {}
    }
    router.replace('/');
  }, [code, isCreator, router]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Group: {code}</Text>
      <Text style={styles.subtitle}>
        WhaTo... {topicDisplayNames[(session?.topic ?? topic) as Topic] ?? topic}
      </Text>

      <View style={styles.participantList}>
        <Text style={styles.sectionTitle}>
          Participants ({participants.length}/8)
        </Text>
        {participants.map(([deviceId, p]) => (
          <View key={deviceId} style={styles.participantRow}>
            <Text style={styles.participant}>{p.name}</Text>
            {deviceId === session?.createdBy && <Crown size={18} color={colors.secondary} weight="fill" />}
          </View>
        ))}
        {participants.length === 0 && (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        )}
      </View>

      <View style={styles.actions}>
        {isCreator === 'true' && (
          <>
            <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
              <Text style={styles.inviteText}>Invite via SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.startButton, participants.length < 2 && styles.buttonDisabled]}
              onPress={handleStart}
              disabled={participants.length < 2}
            >
              <Text style={styles.startText}>Start Swiping</Text>
            </TouchableOpacity>
          </>
        )}
        {isCreator !== 'true' && (
          <Text style={styles.waitingText}>Waiting for host to start...</Text>
        )}
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>
            {isCreator === 'true' ? 'Cancel Group' : 'Leave Group'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    marginBottom: spacing.md,
  },
  participantList: {
    flex: 1,
    marginTop: spacing.xl,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  participant: {
    ...typography.body,
  },
  actions: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  inviteButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  inviteText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
  },
  startText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  waitingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.body,
    color: colors.danger,
    fontWeight: '600',
  },
});
