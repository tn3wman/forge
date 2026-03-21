import { render, screen } from '@testing-library/react';
import { Editor } from '../Editor';

// Monaco requires real DOM - mock it
vi.mock('@monaco-editor/react', () => ({
  default: (props: { language: string; theme: string }) => (
    <div data-testid="monaco-editor" data-language={props.language} data-theme={props.theme} />
  ),
}));

describe('Editor', () => {
  it('renders Monaco editor with correct language', () => {
    render(<Editor filePath="/test/file.ts" content="const x = 1;" language="typescript" />);
    const editor = screen.getByTestId('monaco-editor');
    expect(editor.getAttribute('data-language')).toBe('typescript');
  });

  it('renders with forge-dark theme', () => {
    render(<Editor filePath="/test/file.ts" content="" language="typescript" />);
    const editor = screen.getByTestId('monaco-editor');
    expect(editor.getAttribute('data-theme')).toBe('forge-dark');
  });

  it('renders with different languages', () => {
    render(<Editor filePath="/test/file.rs" content="" language="rust" />);
    const editor = screen.getByTestId('monaco-editor');
    expect(editor.getAttribute('data-language')).toBe('rust');
  });

  it('accepts onNavigateToFile prop without errors', () => {
    const onNavigateToFile = vi.fn();
    render(
      <Editor
        filePath="/test.ts"
        content=""
        language="typescript"
        onNavigateToFile={onNavigateToFile}
      />,
    );
    expect(screen.getByTestId('monaco-editor')).toBeDefined();
  });
});
