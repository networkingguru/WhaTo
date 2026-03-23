import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { TopicButton } from '../../src/components/TopicButton';

const MockIcon = (props: any) => <Text testID="mock-icon" />;

describe('TopicButton', () => {
  it('renders display label', () => {
    const { getByText } = render(
      <TopicButton label="Eat?" color="#FF6B4A" icon={MockIcon} onPress={() => {}} />
    );
    expect(getByText('Eat?')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TopicButton label="Eat?" color="#FF6B4A" icon={MockIcon} onPress={onPress} />
    );
    fireEvent.press(getByText('Eat?'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
