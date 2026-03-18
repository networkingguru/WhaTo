import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
import { ParticipantData, getParticipantStatus, ParticipantStatus } from '../services/sessionService';

interface ParticipantBarProps {
  participants: Record<string, ParticipantData>;
  selfDeviceId: string;
}

const STATUS_COLORS: Record<ParticipantStatus, string> = {
  done: colors.success,
  swiping: colors.connected,
  offline: colors.danger,
};

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  done: 'done',
  swiping: 'swiping',
  offline: 'offline',
};

export function ParticipantBar({ participants, selfDeviceId }: ParticipantBarProps) {
  const [tooltip, setTooltip] = useState<{ name: string; status: ParticipantStatus; index: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const others = Object.entries(participants)
    .filter(([id]) => id !== selfDeviceId)
    .sort(([, a], [, b]) => a.joinedAt - b.joinedAt);

  if (others.length === 0) return null;

  const showTooltip = (name: string, status: ParticipantStatus, index: number) => {
    setTooltip({ name, status, index });
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltip(null), 2000);
  };

  const hideTooltip = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(null);
  };

  return (
    <View style={styles.container}>
      {tooltip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            {tooltip.name} — {STATUS_LABELS[tooltip.status]}
          </Text>
        </View>
      )}
      <View style={styles.row}>
        {others.map(([id, p], index) => {
          const status = getParticipantStatus(p);
          const bgColor = STATUS_COLORS[status];
          const initial = p.name.charAt(0).toUpperCase();

          return (
            <Pressable
              key={id}
              onPressIn={() => showTooltip(p.name, status, index)}
              onPressOut={hideTooltip}
            >
              <View style={[styles.avatar, { backgroundColor: bgColor }]}>
                <Text style={styles.initial}>{initial}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,107,74,0.05)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tooltip: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
    backgroundColor: 'rgba(45,45,45,0.9)',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    zIndex: 10,
  },
  tooltipText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
});
