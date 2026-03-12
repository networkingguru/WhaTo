import React from 'react';
import { render } from '@testing-library/react-native';
import { SwipeDeck } from '../../src/components/SwipeDeck';
import { CardItem } from '../../src/providers/types';

// Mock reanimated since native worklets aren't available in the test environment
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (comp: any) => comp,
    },
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (fn: any) => ({}),
    withSpring: (val: any) => val,
    withTiming: (val: any, _opts: any, cb: any) => { if (cb) cb(true); return val; },
    runOnJS: (fn: any) => fn,
    interpolate: (_val: any, _in: any, out: any) => out[1],
    Extrapolation: { CLAMP: 'clamp' },
  };
});

// Mock gesture handler for testing (GestureDetector requires GestureHandlerRootView)
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: () => ({
        onUpdate: (cb: any) => ({ onEnd: (cb2: any) => ({ onUpdate: cb, onEnd: cb2 }) }),
      }),
    },
  };
});

const mockCards: CardItem[] = [
  {
    id: '1',
    title: 'Card One',
    subtitle: 'Sub 1',
    imageUrl: null,
    rating: 3,
    details: [],
    sourceUrl: null,
    meta: {},
  },
  {
    id: '2',
    title: 'Card Two',
    subtitle: 'Sub 2',
    imageUrl: null,
    rating: 4,
    details: [],
    sourceUrl: null,
    meta: {},
  },
];

describe('SwipeDeck', () => {
  it('renders the top card', () => {
    const { getByText } = render(
      <SwipeDeck
        cards={mockCards}
        onSwipeRight={() => {}}
        onSwipeLeft={() => {}}
        onEmpty={() => {}}
      />
    );
    expect(getByText('Card One')).toBeTruthy();
  });

  it('calls onEmpty when no cards', () => {
    const onEmpty = jest.fn();
    render(
      <SwipeDeck
        cards={[]}
        onSwipeRight={() => {}}
        onSwipeLeft={() => {}}
        onEmpty={onEmpty}
      />
    );
    expect(onEmpty).toHaveBeenCalled();
  });
});
