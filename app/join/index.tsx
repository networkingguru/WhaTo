import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, typography } from '../../src/theme';
import { joinSession } from '../../src/services/sessionService';
import { getDeviceId } from '../../src/services/deviceId';
import { trackGroupSessionJoined } from '../../src/services/analytics';
import { logError } from '../../src/services/crashlytics';

const DISPLAY_NAME_KEY = 'whato_display_name';

export default function JoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code ?? '');
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(DISPLAY_NAME_KEY).then((saved) => {
      if (saved) setName(saved);
    });
  }, []);

  async function handleJoin() {
    if (!code.trim() || !name.trim()) {
      Alert.alert('Missing info', 'Please enter the group code and your name.');
      return;
    }

    setJoining(true);
    try {
      const deviceId = await getDeviceId();
      const trimmedName = name.trim().slice(0, 20);
      const result = await joinSession(code.trim().toUpperCase(), deviceId, trimmedName);

      if (result.success) {
        await AsyncStorage.setItem(DISPLAY_NAME_KEY, trimmedName);
        trackGroupSessionJoined();
        router.replace({
          pathname: '/lobby',
          params: { code: code.trim().toUpperCase(), topic: '', isCreator: 'false' },
        });
      } else {
        Alert.alert('Could not join', result.error ?? 'Unknown error');
      }
    } catch (err) {
      logError(err, 'join_session');
      Alert.alert('Error', "Couldn't connect — try again in a moment.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.replace('/')}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.form}>
            <Text style={styles.title}>Join Group</Text>

            <Text style={styles.label}>Group Code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="ABCD"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={4}
            />

            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textSecondary}
              autoCorrect={false}
              maxLength={20}
            />

            <TouchableOpacity
              style={[styles.joinButton, joining && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.joinText}>Join</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    ...typography.body,
    color: colors.primary,
    paddingVertical: spacing.md,
  },
  content: {
    flex: 1,
  },
  form: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  joinButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  joinText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
