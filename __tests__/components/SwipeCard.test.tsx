import React from 'react';
import { render } from '@testing-library/react-native';
import { SwipeCard } from '../../src/components/SwipeCard';
import { CardItem } from '../../src/providers/types';

const mockCard: CardItem = {
  id: 'test-1',
  title: 'Test Title',
  subtitle: 'Test Subtitle',
  imageUrl: 'https://example.com/image.jpg',
  rating: 4.2,
  details: ['Detail 1', 'Detail 2'],
  sourceUrl: null,
  meta: {},
};

describe('SwipeCard', () => {
  it('renders card title and subtitle', () => {
    const { getByText } = render(<SwipeCard card={mockCard} />);
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Subtitle')).toBeTruthy();
  });

  it('renders details', () => {
    const { getByText } = render(<SwipeCard card={mockCard} />);
    expect(getByText('Detail 1')).toBeTruthy();
    expect(getByText('Detail 2')).toBeTruthy();
  });

  it('renders rating when provided', () => {
    const { getByText } = render(<SwipeCard card={mockCard} />);
    expect(getByText('4.2')).toBeTruthy();
  });

  it('handles null imageUrl gracefully', () => {
    const noImageCard = { ...mockCard, imageUrl: null };
    const { getByText } = render(<SwipeCard card={noImageCard} />);
    expect(getByText('Test Title')).toBeTruthy();
  });
});
