import React from 'react';
import { render } from '@testing-library/react-native';
import { StarRating } from '../../src/components/StarRating';

describe('StarRating', () => {
  it('renders correct number of filled stars for whole rating', () => {
    const { getAllByTestId } = render(<StarRating rating={4} />);
    const filled = getAllByTestId('star-filled');
    expect(filled.length).toBe(4);
  });

  it('renders half star for fractional rating', () => {
    const { getAllByTestId, getByTestId } = render(<StarRating rating={3.5} />);
    const filled = getAllByTestId('star-filled');
    expect(filled.length).toBe(3);
    expect(getByTestId('star-half')).toBeTruthy();
  });

  it('renders 5 stars total', () => {
    const { getAllByTestId } = render(<StarRating rating={2} />);
    const filled = getAllByTestId('star-filled');
    const empty = getAllByTestId('star-empty');
    expect(filled.length + empty.length).toBe(5);
  });

  it('renders nothing when rating is null', () => {
    const { queryByTestId } = render(<StarRating rating={null} />);
    expect(queryByTestId('star-filled')).toBeNull();
  });
});
