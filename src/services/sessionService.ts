import { ref, set, get, onValue, update, onDisconnect, runTransaction } from 'firebase/database';
import { getDb } from './firebase';
import { CardItem, Topic } from '../providers/types';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_PARTICIPANTS = 8;

export interface SessionData {
  topic: Topic;
  status: 'waiting' | 'active' | 'complete';
  createdBy: string;
  createdAt: number;
  round?: number;
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
  connected?: boolean;
  lastConnected?: number;
  swipes?: Record<string, boolean>;
}

export interface MatchResult {
  unanimous: string[];
  majority: string[];
}

export type ParticipantStatus = 'done' | 'swiping' | 'offline';

export function getParticipantStatus(participant: ParticipantData): ParticipantStatus {
  if (participant.completed) return 'done';
  if (participant.connected) return 'swiping';
  return 'offline';
}

export async function setPresence(
  code: string,
  deviceId: string
): Promise<() => void> {
  const connectedRef = ref(getDb(), `sessions/${code}/participants/${deviceId}/connected`);
  const lastConnectedRef = ref(getDb(), `sessions/${code}/participants/${deviceId}/lastConnected`);

  await set(connectedRef, true);
  await set(lastConnectedRef, Date.now());

  const disconnectRef = onDisconnect(connectedRef);
  await disconnectRef.set(false);

  return () => {
    disconnectRef.cancel();
    set(connectedRef, false);
  };
}

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
): Promise<string> {
  const MAX_RETRIES = 5;
  let currentCode = code;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const sessionRef = ref(getDb(), `sessions/${currentCode}`);

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

    let committed = false;
    try {
      const txResult = await runTransaction(sessionRef, (current) => {
        if (current !== null) {
          return undefined;
        }
        return sessionData;
      });
      committed = txResult.committed;
    } catch (txErr) {
      console.warn(`[createSession] Transaction failed for code ${currentCode}:`, txErr);
      throw txErr;
    }

    if (committed) {
      // Verify the write actually persisted
      const verify = await get(sessionRef);
      if (!verify.exists()) {
        console.warn(`[createSession] Write appeared committed but data not found for ${currentCode}`);
        throw new Error('Session creation failed — data not persisted');
      }
      return currentCode;
    }

    // Slot was taken; generate a new code and retry
    currentCode = generateSessionCode();
  }

  throw new Error('Failed to generate a unique session code after multiple attempts');
}

export async function joinSession(
  code: string,
  deviceId: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  const sessionRef = ref(getDb(), `sessions/${code}`);

  // Pre-flight read — confirms session exists and seeds the local cache
  const snapshot = await get(sessionRef);
  if (!snapshot.exists()) {
    return { success: false, error: 'Session not found' };
  }
  const preflight = snapshot.val() as SessionData;

  const result: { success: boolean; error?: string } = { success: false, error: 'Transaction failed' };

  try {
  await runTransaction(sessionRef, (current: SessionData | null) => {
    // Reset result on every invocation — Firebase may retry the callback on contention
    result.success = false;
    result.error = 'Transaction failed';

    // Firebase may pass null on first invocation if local cache is cold.
    // Use pre-flight data as fallback since we confirmed it exists.
    const session = current ?? preflight;
    if (!session) {
      result.error = 'Session not found';
      return; // abort transaction
    }

    if (isSessionExpired(session.createdAt)) {
      result.error = 'Session has expired';
      return;
    }

    if (session.status === 'active') {
      result.error = 'Session already started';
      return;
    }

    if (session.status === 'complete') {
      result.error = 'Session has ended';
      return;
    }

    const participantCount = Object.keys(session.participants || {}).length;
    if (participantCount >= MAX_PARTICIPANTS) {
      result.error = 'Session is full (max 8 participants)';
      return;
    }

    // Add participant atomically
    if (!session.participants) session.participants = {};
    session.participants[deviceId] = {
      name: displayName,
      joinedAt: Date.now(),
    };

    result.success = true;
    result.error = undefined;
    return session;
  });
  } catch (txErr) {
    // Transaction rejected by server (e.g., validation rules)
    if (result.success) {
      // Callback said success but server rejected — likely a rules issue
      result.success = false;
      result.error = `Server rejected: ${txErr instanceof Error ? txErr.message : String(txErr)}`;
    }
  }

  return result;
}

export async function startSession(code: string): Promise<void> {
  const sessionRef = ref(getDb(), `sessions/${code}`);
  const snap = await get(sessionRef);
  const preflight = snap.exists() ? (snap.val() as SessionData) : null;
  await runTransaction(sessionRef, (current: SessionData | null) => {
    const session = current ?? preflight;
    if (!session || session.status !== 'waiting') return;
    return { ...session, status: 'active' as const };
  });
}

export async function endSession(code: string): Promise<void> {
  const sessionRef = ref(getDb(), `sessions/${code}`);
  const snap = await get(sessionRef);
  const preflight = snap.exists() ? (snap.val() as SessionData) : null;
  await runTransaction(sessionRef, (current: SessionData | null) => {
    const session = current ?? preflight;
    if (!session || session.status === 'complete') return;
    return { ...session, status: 'complete' as const };
  });
}

export async function recordSwipe(
  code: string,
  deviceId: string,
  cardId: string,
  liked: boolean
): Promise<void> {
  await update(
    ref(getDb(), `sessions/${code}/participants/${deviceId}/swipes`),
    { [cardId]: liked }
  );
}

export async function markCompleted(
  code: string,
  deviceId: string
): Promise<void> {
  await update(ref(getDb(), `sessions/${code}/participants/${deviceId}`), {
    completed: true,
  });
}

export function listenToSession(
  code: string,
  callback: (session: SessionData | null) => void
): () => void {
  const sessionRef = ref(getDb(), `sessions/${code}`);
  const unsubscribe = onValue(sessionRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as SessionData) : null);
  });
  return unsubscribe;
}

export async function getSession(code: string): Promise<SessionData | null> {
  const snapshot = await get(ref(getDb(), `sessions/${code}`));
  return snapshot.exists() ? (snapshot.val() as SessionData) : null;
}

/**
 * Compute unanimous matches from swipes so far (real-time, doesn't require completion).
 * A card is a "live match" if every participant has right-swiped it.
 */
export function computeLiveMatches(session: SessionData): string[] {
  const participantIds = Object.keys(session.participants || {});
  if (participantIds.length < 2) return [];

  // Collect all card IDs that at least one person liked
  const likedByAll: string[] = [];
  const allLiked = new Set<string>();
  for (const pid of participantIds) {
    const swipes = session.participants[pid].swipes;
    if (swipes) {
      for (const [cardId, liked] of Object.entries(swipes)) {
        if (liked) allLiked.add(cardId);
      }
    }
  }

  for (const cardId of allLiked) {
    const everyoneLiked = participantIds.every(
      (pid) => session.participants[pid].swipes?.[cardId] === true
    );
    if (everyoneLiked) likedByAll.push(cardId);
  }

  return likedByAll;
}

/**
 * Check if any participant has exhausted all cards with zero right-swipes.
 */
export function hasHopelessParticipant(session: SessionData): boolean {
  const participantIds = Object.keys(session.participants || {});
  const totalCards = session.cards.length;

  for (const pid of participantIds) {
    const swipes = session.participants[pid].swipes;
    if (!swipes) continue;
    const swipeCount = Object.keys(swipes).length;
    const yesCount = Object.values(swipes).filter(Boolean).length;
    if (swipeCount >= totalCards && yesCount === 0) return true;
  }
  return false;
}

/**
 * Start a new round with a subset of cards. Resets all participants' swipes and completed status.
 */
export async function startNextRound(
  code: string,
  matchedCards: CardItem[]
): Promise<void> {
  const sessionRef = ref(getDb(), `sessions/${code}`);
  const snap = await get(sessionRef);
  const preflight = snap.exists() ? (snap.val() as SessionData) : null;

  await runTransaction(sessionRef, (current: SessionData | null) => {
    const session = current ?? preflight;
    if (!session) return;

    const currentRound = session.round ?? 1;

    // Reset swipes and completed, but preserve presence fields
    const resetParticipants: Record<string, ParticipantData> = {};
    for (const [pid, pdata] of Object.entries(session.participants)) {
      resetParticipants[pid] = {
        name: pdata.name,
        joinedAt: pdata.joinedAt,
        connected: pdata.connected,
        lastConnected: pdata.lastConnected,
      };
    }

    return {
      ...session,
      status: 'active' as const,
      cards: matchedCards,
      round: currentRound + 1,
      participants: resetParticipants,
    };
  });
}
