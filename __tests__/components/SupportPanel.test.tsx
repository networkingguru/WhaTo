import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SupportPanel } from '../../src/components/SupportPanel';

describe('SupportPanel', () => {
  it('renders the creator message', () => {
    const { getByText } = render(
      <SupportPanel visible={true} onClose={() => {}} />
    );
    expect(getByText(/I made this app/)).toBeTruthy();
  });

  it('renders support links', () => {
    const { getByText } = render(
      <SupportPanel visible={true} onClose={() => {}} />
    );
    expect(getByText(/books/i)).toBeTruthy();
    expect(getByText(/podcast/i)).toBeTruthy();
    expect(getByText(/Buy me a coffee/i)).toBeTruthy();
    expect(getByText(/rate/i)).toBeTruthy();
  });

  it('calls onClose when dismiss is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <SupportPanel visible={true} onClose={onClose} />
    );
    fireEvent.press(getByText('Roll up the scroll'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <SupportPanel visible={false} onClose={() => {}} />
    );
    expect(queryByText(/I made this app/)).toBeNull();
  });
});
