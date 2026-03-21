import { renderHook } from '@testing-library/react';
import { useHotkeys } from '../useHotkeys';

describe('useHotkeys', () => {
  it('calls onSelect with index 0 for Cmd+1', () => {
    const onSelect = vi.fn();
    renderHook(() => useHotkeys({ itemCount: 3, onSelect }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', metaKey: true }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('calls onSelect with index 0 for Ctrl+1 (Windows/Linux)', () => {
    const onSelect = vi.fn();
    renderHook(() => useHotkeys({ itemCount: 3, onSelect }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', ctrlKey: true }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('calls onSelect with index 8 for Cmd+9', () => {
    const onSelect = vi.fn();
    renderHook(() => useHotkeys({ itemCount: 9, onSelect }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '9', metaKey: true }));
    expect(onSelect).toHaveBeenCalledWith(8);
  });

  it('does not call onSelect if index exceeds itemCount', () => {
    const onSelect = vi.fn();
    renderHook(() => useHotkeys({ itemCount: 2, onSelect }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', metaKey: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not fire without modifier key', () => {
    const onSelect = vi.fn();
    renderHook(() => useHotkeys({ itemCount: 3, onSelect }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const onSelect = vi.fn();
    renderHook(() => useHotkeys({ itemCount: 3, onSelect, enabled: false }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', metaKey: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
