import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TopicButton } from '../../src/components/TopicButton';

describe('TopicButton', () => {
  it('renders label and emoji', () => {
    const { getByText } = render(
      <TopicButton label="Movies" emoji="🎬" onPress={() => {}} />
    );
    expect(getByText('🎬')).toBeTruthy();
    expect(getByText('Movies')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TopicButton label="Movies" emoji="🎬" onPress={onPress} />
    );
    fireEvent.press(getByText('Movies'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
