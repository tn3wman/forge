import { render, screen, fireEvent } from '@testing-library/react';
import { SymbolSearch } from '../SymbolSearch';

describe('SymbolSearch', () => {
  const defaultProps = {
    mode: 'file' as const,
    results: [
      {
        name: 'MyComponent',
        kind: 5,
        location: {
          uri: 'file:///test.ts',
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        },
      },
      {
        name: 'handleClick',
        kind: 12,
        location: {
          uri: 'file:///test.ts',
          range: { start: { line: 10, character: 0 }, end: { line: 10, character: 0 } },
        },
      },
    ],
    onQueryChange: vi.fn(),
    onSelect: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders search input with placeholder', () => {
    render(<SymbolSearch {...defaultProps} />);
    expect(screen.getByPlaceholderText('Go to Symbol in File...')).toBeDefined();
  });

  it('shows workspace placeholder when mode is workspace', () => {
    render(<SymbolSearch {...defaultProps} mode="workspace" />);
    expect(screen.getByPlaceholderText('Go to Symbol in Workspace...')).toBeDefined();
  });

  it('displays symbol results', () => {
    render(<SymbolSearch {...defaultProps} />);
    expect(screen.getByText('MyComponent')).toBeDefined();
    expect(screen.getByText('handleClick')).toBeDefined();
  });

  it('calls onQueryChange when typing', () => {
    render(<SymbolSearch {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'handle' } });
    expect(defaultProps.onQueryChange).toHaveBeenCalledWith('handle');
  });

  it('calls onClose on Escape', () => {
    render(<SymbolSearch {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onSelect when result is clicked', () => {
    render(<SymbolSearch {...defaultProps} />);
    screen.getByText('MyComponent').click();
    expect(defaultProps.onSelect).toHaveBeenCalledWith(defaultProps.results[0]);
  });

  it('navigates with arrow keys and selects with Enter', () => {
    render(<SymbolSearch {...defaultProps} />);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(defaultProps.onSelect).toHaveBeenCalledWith(defaultProps.results[0]);
  });
});
