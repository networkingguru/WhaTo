/**
 * Integration tests: analytics events fire from real component interactions.
 *
 * These verify the wiring between UI actions and analytics calls from the
 * user's perspective, not just that the analytics service works in isolation.
 */

// --- Firebase analytics mock ---
const mockLogEvent = jest.fn().mockResolvedValue(undefined);
const mockLogScreenView = jest.fn().mockResolvedValue(undefined);
jest.mock('@react-native-firebase/analytics', () => {
  return () => ({ logEvent: mockLogEvent, logScreenView: mockLogScreenView });
});

// --- Linking mock (patch react-native's Linking) ---
const mockOpenURL = jest.fn().mockResolvedValue(true);
import { Linking } from 'react-native';
jest.spyOn(Linking, 'openURL').mockImplementation(mockOpenURL);

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FeedbackModal } from '../../src/components/FeedbackModal';

const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. FeedbackModal integration
// ---------------------------------------------------------------------------
describe('FeedbackModal analytics integration', () => {
  it('fires trackFeedbackLinkTapped when user taps "Report a Bug"', async () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <FeedbackModal visible={true} onClose={onClose} />,
    );

    fireEvent.press(getByText('Report a Bug'));
    await flush();

    expect(mockLogEvent).toHaveBeenCalledWith('feedback_link_tapped', {});
    expect(mockOpenURL).toHaveBeenCalledWith(
      expect.stringContaining('Bug+Report'),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('fires trackFeedbackLinkTapped when user taps "Request a Feature"', async () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <FeedbackModal visible={true} onClose={onClose} />,
    );

    fireEvent.press(getByText('Request a Feature'));
    await flush();

    expect(mockLogEvent).toHaveBeenCalledWith('feedback_link_tapped', {});
    expect(mockOpenURL).toHaveBeenCalledWith(
      expect.stringContaining('Feature+Request'),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('does not fire analytics when modal is not visible', () => {
    const { queryByText } = render(
      <FeedbackModal visible={false} onClose={jest.fn()} />,
    );

    // Modal content should not be rendered / interactable
    expect(queryByText('Report a Bug')).toBeNull();
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  it('fires exactly one event per tap (no duplicate tracking)', async () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <FeedbackModal visible={true} onClose={onClose} />,
    );

    fireEvent.press(getByText('Report a Bug'));
    await flush();

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Analytics resilience in component context
// ---------------------------------------------------------------------------
describe('Analytics resilience in FeedbackModal', () => {
  it('component still works when analytics throws synchronously', async () => {
    // Make logEvent throw synchronously
    mockLogEvent.mockImplementationOnce(() => {
      throw new Error('Firebase not initialized');
    });

    const onClose = jest.fn();
    const { getByText } = render(
      <FeedbackModal visible={true} onClose={onClose} />,
    );

    // User action should complete without error
    expect(() => fireEvent.press(getByText('Report a Bug'))).not.toThrow();
    await flush();

    // The user's action still completes: URL opens and modal closes
    expect(mockOpenURL).toHaveBeenCalledWith(
      expect.stringContaining('Bug+Report'),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('component still works when analytics rejects asynchronously', async () => {
    mockLogEvent.mockRejectedValueOnce(new Error('network timeout'));

    const onClose = jest.fn();
    const { getByText } = render(
      <FeedbackModal visible={true} onClose={onClose} />,
    );

    fireEvent.press(getByText('Request a Feature'));
    await flush();

    // User action still completes despite analytics failure
    expect(mockOpenURL).toHaveBeenCalledWith(
      expect.stringContaining('Feature+Request'),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('subsequent analytics calls work after a previous failure', async () => {
    // First call fails
    mockLogEvent.mockRejectedValueOnce(new Error('transient error'));

    const onClose1 = jest.fn();
    const { getByText, rerender } = render(
      <FeedbackModal visible={true} onClose={onClose1} />,
    );

    fireEvent.press(getByText('Report a Bug'));
    await flush();

    // Re-render with fresh modal (simulating re-open)
    const onClose2 = jest.fn();
    rerender(<FeedbackModal visible={true} onClose={onClose2} />);

    fireEvent.press(getByText('Request a Feature'));
    await flush();

    // Second call should succeed - mockLogEvent was called twice total
    expect(mockLogEvent).toHaveBeenCalledTimes(2);
    expect(onClose2).toHaveBeenCalled();
  });
});
