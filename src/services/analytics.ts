type Topic = 'food' | 'movie' | 'show';
type Mode = 'solo' | 'group';

function getAnalytics() {
  try {
    const mod = require('@react-native-firebase/analytics');
    return (mod.default ?? mod)();
  } catch {
    return null;
  }
}

function safe(fn: () => unknown): void {
  try {
    const result = fn();
    if (result && typeof (result as any).catch === 'function') {
      (result as Promise<void>).catch(() => {});
    }
  } catch {
    // never let analytics crash the app
  }
}

export function trackTopicSelected(topic: Topic, mode: Mode): void {
  safe(() => getAnalytics()?.logEvent('topic_selected', { topic, mode }));
}

export function trackSoloSwipeRight(topic: Topic): void {
  safe(() => getAnalytics()?.logEvent('solo_swipe_right', { topic }));
}

export function trackSoloDeckEmpty(topic: Topic): void {
  safe(() => getAnalytics()?.logEvent('solo_deck_empty', { topic }));
}

export function trackCardDetailOpened(topic: Topic): void {
  safe(() => getAnalytics()?.logEvent('card_detail_opened', { topic }));
}

export function trackGroupSessionCreated(topic: Topic): void {
  safe(() => getAnalytics()?.logEvent('group_session_created', { topic }));
}

export function trackGroupSessionJoined(): void {
  safe(() => getAnalytics()?.logEvent('group_session_joined', {}));
}

export function trackGroupSessionStarted(topic: Topic, participantCount: number): void {
  safe(() =>
    getAnalytics()?.logEvent('group_session_started', {
      topic,
      participant_count: participantCount,
    })
  );
}

export function trackGroupMatchFound(topic: Topic): void {
  safe(() => getAnalytics()?.logEvent('group_match_found', { topic }));
}

export function trackGroupNoMatch(topic: Topic): void {
  safe(() => getAnalytics()?.logEvent('group_no_match', { topic }));
}

export function trackFeedbackLinkTapped(): void {
  safe(() => getAnalytics()?.logEvent('feedback_link_tapped', {}));
}

export function trackScreenView(screenName: string): void {
  safe(() =>
    getAnalytics()?.logScreenView({ screen_name: screenName, screen_class: screenName })
  );
}
