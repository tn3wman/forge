import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation } from '../useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  const onActivate = vi.fn();

  beforeEach(() => {
    onActivate.mockReset();
  });

  it('starts with selectedIndex 0', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ itemCount: 3, onActivate }));
    expect(result.current.selectedIndex).toBe(0);
  });

  it('moves down on ArrowDown', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ itemCount: 3, onActivate }));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.selectedIndex).toBe(1);
  });

  it('moves up on ArrowUp', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ itemCount: 3, onActivate }));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    expect(result.current.selectedIndex).toBe(0);
  });

  it('wraps around at bottom', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ itemCount: 3, onActivate }));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.selectedIndex).toBe(0);
  });

  it('wraps around at top', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ itemCount: 3, onActivate }));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });
    expect(result.current.selectedIndex).toBe(2);
  });

  it('calls onActivate with index on Enter', () => {
    renderHook(() => useKeyboardNavigation({ itemCount: 3, onActivate }));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });
    expect(onActivate).toHaveBeenCalledWith(0);
  });

  it('does nothing when itemCount is 0', () => {
    const { result } = renderHook(() => useKeyboardNavigation({ itemCount: 0, onActivate }));
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });
    expect(result.current.selectedIndex).toBe(0);
  });
});
