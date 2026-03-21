import { detectLanguage } from '../languageDetect';

describe('detectLanguage', () => {
  it('detects TypeScript', () => {
    expect(detectLanguage('app.ts')).toBe('typescript');
    expect(detectLanguage('/path/to/file.tsx')).toBe('typescript');
  });
  it('detects JavaScript', () => {
    expect(detectLanguage('index.js')).toBe('javascript');
    expect(detectLanguage('component.jsx')).toBe('javascript');
  });
  it('detects Rust', () => {
    expect(detectLanguage('main.rs')).toBe('rust');
  });
  it('detects JSON', () => {
    expect(detectLanguage('package.json')).toBe('json');
  });
  it('detects CSS', () => {
    expect(detectLanguage('styles.css')).toBe('css');
  });
  it('detects HTML', () => {
    expect(detectLanguage('index.html')).toBe('html');
  });
  it('detects Markdown', () => {
    expect(detectLanguage('README.md')).toBe('markdown');
  });
  it('detects TOML', () => {
    expect(detectLanguage('Cargo.toml')).toBe('toml');
  });
  it('detects YAML', () => {
    expect(detectLanguage('config.yaml')).toBe('yaml');
    expect(detectLanguage('config.yml')).toBe('yaml');
  });
  it('returns plaintext for unknown extensions', () => {
    expect(detectLanguage('file.xyz')).toBe('plaintext');
    expect(detectLanguage('noext')).toBe('plaintext');
  });
});
