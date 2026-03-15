import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CardDetail } from '../../src/components/CardDetail';

const mockCard = {
  id: 'test-1',
  title: 'Test Restaurant',
  subtitle: 'Italian',
  imageUrl: 'https://example.com/img.jpg',
  rating: 4.5,
  details: ['Italian', '$$', '123 Main St'],
  sourceUrl: 'https://yelp.com/biz/test',
  meta: { source: 'yelp' },
};

describe('CardDetail', () => {
  it('renders card title and details', () => {
    const { getByText, getAllByText } = render(
      <CardDetail card={mockCard} visible={true} onClose={() => {}} topic="food" />
    );
    expect(getByText('Test Restaurant')).toBeTruthy();
    expect(getAllByText('Italian').length).toBeGreaterThan(0);
  });

  it('renders action buttons for food topic', () => {
    const { getByText } = render(
      <CardDetail card={mockCard} visible={true} onClose={() => {}} topic="food" />
    );
    expect(getByText(/view on/i)).toBeTruthy();
  });

  it('calls onClose when back is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <CardDetail card={mockCard} visible={true} onClose={onClose} topic="food" />
    );
    fireEvent.press(getByText('← Back to swiping'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <CardDetail card={mockCard} visible={false} onClose={() => {}} topic="food" />
    );
    expect(queryByText('Test Restaurant')).toBeNull();
  });
});
