import { ref, set, get, onValue, update, off } from 'firebase/database';
import { database } from './firebase';
import { CardItem, Topic } from '../providers/types';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PARTICIPANTS = 8;

export interface SessionData {
  topic: Topic;
  status: 'waiting' | 'active' | 'complete';
  createdBy: string;
  createdAt: number;
  location?: {
    latitude: number;
    longitude: number;
    radiusMiles: number;
  };
  cards: CardItem[];
  participants: Record<string, ParticipantData>;
}

export interface ParticipantData {
  name: string;
  joinedAt: number;
  completed?: boolean;
  swipes?: Record<string, boolean>;
}

export interface MatchResult {
  unanimous: string[];
  majority: string[];
}

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `WHATO-${code}`;
}

export function isSessionExpired(createdAt: number): boolean {
  return Date.now() - createdAt > SESSION_TTL_MS;
}

export function computeMatches(
  participants: Record<string, { name: string; swipes: Record<string, boolean> }>
): MatchResult {
  const participantIds = Object.keys(participants);
  const totalParticipants = participantIds.length;
  if (totalParticipants === 0) return { unanimous: [], majority: [] };

  const allCardIds = new Set<string>();
  for (const p of participantIds) {
    const swipes = participants[p].swipes;
    if (swipes) {
      for (const cardId of Object.keys(swipes)) {
        allCardIds.add(cardId);
      }
    }
  }

  const unanimous: string[] = [];
  const majority: string[] = [];

  for (const cardId of allCardIds) {
    let yesCount = 0;
    for (const p of participantIds) {
      if (participants[p].swipes?.[cardId] === true) {
        yesCount++;
      }
    }

    if (yesCount === totalParticipants) {
      unanimous.push(cardId);
    } else if (yesCount > totalParticipants / 2) {
      majority.push(cardId);
    }
  }

  return { unanimous, majority };
}

export async function createSession(
  code: string,
  topic: Topic,
  deviceId: string,
  displayName: string,
  cards: CardItem[],
  location?: { latitude: number; longitude: number; radiusMiles: number }
): Promise<void> {
  const sessionRef = ref(database, `sessions/${code}`);
  const sessionData: SessionData = {
    topic,
    status: 'waiting',
    createdBy: deviceId,
    createdAt: Date.now(),
    ...(location && { location }),
    cards,
    participants: {
      [deviceId]: {
        name: displayName,
        joinedAt: Date.now(),
      },
    },
  };
  await set(sessionRef, sessionData);
}

export async function joinSession(
  code: string,
  deviceId: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  const sessionRef = ref(database, `sessions/${code}`);
  const snapshot = await get(sessionRef);

  if (!snapshot.exists()) {
    return { success: false, error: 'Session not found' };
  }

  const session = snapshot.val() as SessionData;

  if (isSessionExpired(session.createdAt)) {
    return { success: false, error: 'Session has expired' };
  }

  if (session.status === 'active') {
    return { success: false, error: 'Session already started' };
  }

  if (session.status === 'complete') {
    return { success: false, error: 'Session has ended' };
  }

  const participantCount = Object.keys(session.participants || {}).length;
  if (participantCount >= MAX_PARTICIPANTS) {
    return { success: false, error: 'Session is full (max 8 participants)' };
  }

  await update(ref(database, `sessions/${code}/participants/${deviceId}`), {
    name: displayName,
    joinedAt: Date.now(),
  });

  return { success: true };
}

export async function startSession(code: string): Promise<void> {
  await update(ref(database, `sessions/${code}`), { status: 'active' });
}

export async function endSession(code: string): Promise<void> {
  await update(ref(database, `sessions/${code}`), { status: 'complete' });
}

export async function recordSwipe(
  code: string,
  deviceId: string,
  cardId: string,
  liked: boolean
): Promise<void> {
  await update(
    ref(database, `sessions/${code}/participants/${deviceId}/swipes`),
    { [cardId]: liked }
  );
}

export async function markCompleted(
  code: string,
  deviceId: string
): Promise<void> {
  await update(ref(database, `sessions/${code}/participants/${deviceId}`), {
    completed: true,
  });
}

export function listenToSession(
  code: string,
  callback: (session: SessionData | null) => void
): () => void {
  const sessionRef = ref(database, `sessions/${code}`);
  const handler = onValue(sessionRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as SessionData) : null);
  });
  return () => off(sessionRef, 'value', handler);
}

export async function getSession(code: string): Promise<SessionData | null> {
  const snapshot = await get(ref(database, `sessions/${code}`));
  return snapshot.exists() ? (snapshot.val() as SessionData) : null;
}
