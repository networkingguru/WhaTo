jest.mock('@react-native-firebase/analytics', () => {
  const logEvent = jest.fn().mockResolvedValue(undefined);
  const logScreenView = jest.fn().mockResolvedValue(undefined);
  return () => ({ logEvent, logScreenView });
});

import analytics from '@react-native-firebase/analytics';
import {
  trackTopicSelected,
  trackSoloSwipeRight,
  trackSoloDeckEmpty,
  trackCardDetailOpened,
  trackGroupSessionCreated,
  trackGroupSessionJoined,
  trackGroupSessionStarted,
  trackGroupMatchFound,
  trackGroupNoMatch,
  trackFeedbackLinkTapped,
  trackScreenView,
} from '../../src/services/analytics';

const mockAnalytics = analytics as jest.MockedFunction<typeof analytics>;

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper: flush all pending promises
const flush = () => new Promise((r) => setImmediate(r));

describe('analytics service', () => {
  it('trackTopicSelected logs topic_selected with topic and mode', async () => {
    trackTopicSelected('food', 'solo');
    await flush();
    expect(mockAnalytics().logEvent).toHaveBeenCalledWith('topic_selected', { topic: 'food', mode: 'solo' });
  });

  it('trackSoloSwipeRight logs solo_swipe_right with topic', async () => {
    trackSoloSwipeRight('movie');
    await flush();
    expect(mockAnalytics().logEvent).toHaveBeenCalledWith('solo_swipe_right', { topic: 'movie' });
  });

  it('trackSoloDeckEmpty logs solo_deck_empty with topic', async () => {
    trackSoloDeckEmpty('show');
    await flush();
    expect(mockAnalytics().logEvent).toHaveBeenCalledWith('solo_deck_empty', { topic: 'show' });
  });

  it('trackCardDetailOpened logs card_detail_opened with topic', async () => {
    trackCardDetailOpened('food');
    await flush();
    expect(mockAnalytics().logEvent).toHaveBeenCalledWith('card_detail_opened', { topic: 'food' });
  });

  it('trackGroupSessionCreated logs group_session_created with topic', async () => {
    trackGroupSessionCreated('movie');
    await flush();
    expect(mockAnalytics().logEvent).toHaveBeenCalledWith('group_session_created', { topic: 'movie' });
  });

  it('trackGroupSessionJoined logs group_session_joined with no params', async () => {
    trackGroupSessionJoined();
    await flush();
    expect(mockAnalytics().logEvent).toHaveBeenCalledWith('group_session_joined', {});
  });

  it('trackGroupSessionStarted logs group_session_started with topic and count', async () => {
    trackGroupSessionStarted('food', 3);
    await flush();
    expect(mockAnalytics().logEvent).toHaveBeenCalledWith('group_session_started', { topic: 'food', participant_count: 3 });
  });

  it('trackGroupMatchFound logs group_match_found with topic', async () => {
    trackGroupMatchFound('show');
    await flush();
    expect(mockAnalytics().logEvent).toHaveBeenCalledWith('group_match_found', { topic: 'show' });
  });

  it('trackGroupNoMatch logs group_no_match with topic', async () => {
    trackGroupNoMatch('food');
    await flush();
    expect(mockAnalytics().logEvent).toHaveBeenCalledWith('group_no_match', { topic: 'food' });
  });

  it('trackFeedbackLinkTapped logs feedback_link_tapped', async () => {
    trackFeedbackLinkTapped();
    await flush();
    expect(mockAnalytics().logEvent).toHaveBeenCalledWith('feedback_link_tapped', {});
  });

  it('trackScreenView calls logScreenView with screen_name', async () => {
    trackScreenView('/swipe');
    await flush();
    expect(mockAnalytics().logScreenView).toHaveBeenCalledWith({ screen_name: '/swipe', screen_class: '/swipe' });
  });

  it('does not throw if analytics().logEvent rejects', async () => {
    (mockAnalytics().logEvent as jest.Mock).mockRejectedValueOnce(new Error('network error'));
    expect(() => trackTopicSelected('food', 'solo')).not.toThrow();
    await flush();
  });
});
