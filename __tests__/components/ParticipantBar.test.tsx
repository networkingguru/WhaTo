import React from 'react';
import { render } from '@testing-library/react-native';
import { ParticipantBar } from '../../src/components/ParticipantBar';
import { ParticipantData } from '../../src/services/sessionService';

jest.mock('../../src/services/sessionService', () => ({
  getParticipantStatus: (p: ParticipantData) => {
    if (p.completed) return 'done';
    if (p.connected) return 'swiping';
    return 'offline';
  },
}));

const participants: Record<string, ParticipantData> = {
  dev1: { name: 'Sarah', joinedAt: 0, connected: true },
  dev2: { name: 'Mike', joinedAt: 0, completed: true, connected: true },
  dev3: { name: 'Kim', joinedAt: 0, connected: false },
  self: { name: 'You', joinedAt: 0, connected: true },
};

describe('ParticipantBar', () => {
  it('renders initials for other participants, excluding self', () => {
    const { getByText, queryByText } = render(
      <ParticipantBar participants={participants} selfDeviceId="self" />
    );
    expect(getByText('S')).toBeTruthy();
    expect(getByText('M')).toBeTruthy();
    expect(getByText('K')).toBeTruthy();
    expect(queryByText('Y')).toBeNull();
  });

  it('renders nothing when only self is in session', () => {
    const { queryByText } = render(
      <ParticipantBar participants={{ self: { name: 'You', joinedAt: 0, connected: true } }} selfDeviceId="self" />
    );
    expect(queryByText('Y')).toBeNull();
  });

  it('renders all 7 participants when session is full', () => {
    const full: Record<string, ParticipantData> = {};
    const names = ['Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace'];
    names.forEach((name, i) => {
      full[`dev${i}`] = { name, joinedAt: 0, connected: true };
    });
    full['self'] = { name: 'Me', joinedAt: 0, connected: true };

    const { getByText } = render(
      <ParticipantBar participants={full} selfDeviceId="self" />
    );
    names.forEach(name => {
      expect(getByText(name[0])).toBeTruthy();
    });
  });
});
