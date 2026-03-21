import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import { NavigationProvider, useNavigation } from '../NavigationContext';

function wrapper({ children }: { children: ReactNode }) {
  return <NavigationProvider>{children}</NavigationProvider>;
}

describe('NavigationContext', () => {
  it('starts at harbor screen', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });
    expect(result.current.screen).toEqual({ type: 'harbor' });
  });

  it('navigates to a bay', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });
    act(() => result.current.openBay('bay-123'));
    expect(result.current.screen).toEqual({ type: 'bay', bayId: 'bay-123' });
  });

  it('navigates back to harbor', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });
    act(() => result.current.openBay('bay-123'));
    act(() => result.current.openHarbor());
    expect(result.current.screen).toEqual({ type: 'harbor' });
  });
});
