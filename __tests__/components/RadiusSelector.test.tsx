import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RadiusSelector } from '../../src/components/RadiusSelector';

describe('RadiusSelector', () => {
  it('renders all radius options', () => {
    const { getByText } = render(
      <RadiusSelector selected={5} onSelect={() => {}} />
    );
    expect(getByText('1 mi')).toBeTruthy();
    expect(getByText('5 mi')).toBeTruthy();
    expect(getByText('10 mi')).toBeTruthy();
    expect(getByText('25 mi')).toBeTruthy();
  });

  it('highlights the selected radius', () => {
    const { getByText } = render(
      <RadiusSelector selected={5} onSelect={() => {}} />
    );
    expect(getByText('5 mi')).toBeTruthy();
  });

  it('calls onSelect with the chosen radius', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <RadiusSelector selected={5} onSelect={onSelect} />
    );
    fireEvent.press(getByText('10 mi'));
    expect(onSelect).toHaveBeenCalledWith(10);
  });
});
