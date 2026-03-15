import React from 'react';
import { render } from '@testing-library/react-native';
import { Logo } from '../../src/components/Logo';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

describe('Logo', () => {
  it('renders WhaTo? text', () => {
    const { getByText } = render(<Logo />);
    expect(getByText(/Wha/)).toBeTruthy();
    expect(getByText(/To/)).toBeTruthy();
  });

  it('renders small variant', () => {
    const { getByText } = render(<Logo size="small" />);
    expect(getByText(/Wha/)).toBeTruthy();
  });
});
