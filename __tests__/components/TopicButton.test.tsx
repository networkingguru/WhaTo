import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TopicButton } from '../../src/components/TopicButton';

jest.mock('phosphor-react-native', () => ({
  ForkKnife: 'ForkKnife',
  FilmSlate: 'FilmSlate',
  Television: 'Television',
}));

describe('TopicButton', () => {
  it('renders display label', () => {
    const { getByText } = render(
      <TopicButton label="Eat?" color="#FF6B4A" icon="ForkKnife" onPress={() => {}} />
    );
    expect(getByText('Eat?')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TopicButton label="Eat?" color="#FF6B4A" icon="ForkKnife" onPress={onPress} />
    );
    fireEvent.press(getByText('Eat?'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
