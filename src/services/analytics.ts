import analytics from '@react-native-firebase/analytics';

type Topic = 'food' | 'movie' | 'show';
type Mode = 'solo' | 'group';

function safe(fn: () => Promise<void>): void {
  try {
    fn().catch(() => {});
  } catch {
    // never let analytics crash the app
  }
}

export function trackTopicSelected(topic: Topic, mode: Mode): void {
  safe(() => analytics().logEvent('topic_selected', { topic, mode }));
}

export function trackSoloSwipeRight(topic: Topic): void {
  safe(() => analytics().logEvent('solo_swipe_right', { topic }));
}

export function trackSoloDeckEmpty(topic: Topic): void {
  safe(() => analytics().logEvent('solo_deck_empty', { topic }));
}

export function trackCardDetailOpened(topic: Topic): void {
  safe(() => analytics().logEvent('card_detail_opened', { topic }));
}

export function trackGroupSessionCreated(topic: Topic): void {
  safe(() => analytics().logEvent('group_session_created', { topic }));
}

export function trackGroupSessionJoined(): void {
  safe(() => analytics().logEvent('group_session_joined', {}));
}

export function trackGroupSessionStarted(topic: Topic, participantCount: number): void {
  safe(() =>
    analytics().logEvent('group_session_started', {
      topic,
      participant_count: participantCount,
    })
  );
}

export function trackGroupMatchFound(topic: Topic): void {
  safe(() => analytics().logEvent('group_match_found', { topic }));
}

export function trackGroupNoMatch(topic: Topic): void {
  safe(() => analytics().logEvent('group_no_match', { topic }));
}

export function trackFeedbackLinkTapped(): void {
  safe(() => analytics().logEvent('feedback_link_tapped', {}));
}

export function trackScreenView(screenName: string): void {
  safe(() =>
    analytics().logScreenView({ screen_name: screenName, screen_class: screenName })
  );
}
