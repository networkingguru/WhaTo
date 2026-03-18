jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (comp: any) => comp,
    },
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: () => ({}),
    withTiming: (val: any) => val,
    withDelay: (_delay: any, val: any) => val,
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { LegendToast } from '../../src/components/LegendToast';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('LegendToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders legend rows when not previously seen', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const { findByText } = render(<LegendToast dismissed={false} />);
    expect(await findByText('Swiping')).toBeTruthy();
    expect(await findByText('Done')).toBeTruthy();
    expect(await findByText('Disconnected')).toBeTruthy();
  });

  it('does not render when previously seen', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const { queryByText } = render(<LegendToast dismissed={false} />);
    // Give effect time to run
    await new Promise(r => setTimeout(r, 50));
    expect(queryByText('Swiping')).toBeNull();
  });
});
