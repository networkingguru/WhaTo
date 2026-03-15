import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SparkleButton } from '../../src/components/SparkleButton';

jest.mock('phosphor-react-native', () => {
  const { View } = require('react-native');
  return { Sparkle: View };
});

describe('SparkleButton', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<SparkleButton onPress={() => {}} />);
    expect(getByTestId('sparkle-button')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<SparkleButton onPress={onPress} />);
    fireEvent.press(getByTestId('sparkle-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
