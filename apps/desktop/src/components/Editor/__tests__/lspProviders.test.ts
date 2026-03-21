import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerLspProviders } from '../lspProviders';

vi.mock('../../../ipc', () => ({
  lspIpc: {
    completion: vi.fn().mockResolvedValue([]),
    hover: vi.fn().mockResolvedValue(null),
    definition: vi.fn().mockResolvedValue(null),
    documentSymbols: vi.fn().mockResolvedValue([]),
  },
}));

describe('registerLspProviders', () => {
  const mockDisposable = { dispose: vi.fn() };
  const mockMonaco = {
    languages: {
      registerCompletionItemProvider: vi.fn(() => mockDisposable),
      registerHoverProvider: vi.fn(() => mockDisposable),
      registerDefinitionProvider: vi.fn(() => mockDisposable),
    },
    editor: {
      setModelMarkers: vi.fn(),
    },
    Uri: {
      parse: vi.fn((s: string) => ({ toString: () => s })),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMonaco.languages.registerCompletionItemProvider.mockReturnValue(mockDisposable);
    mockMonaco.languages.registerHoverProvider.mockReturnValue(mockDisposable);
    mockMonaco.languages.registerDefinitionProvider.mockReturnValue(mockDisposable);
  });

  it('registers completion provider', () => {
    registerLspProviders(mockMonaco as any, 'bay-1', 'typescript');
    expect(mockMonaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
      'typescript',
      expect.objectContaining({ provideCompletionItems: expect.any(Function) }),
    );
  });

  it('registers hover provider', () => {
    registerLspProviders(mockMonaco as any, 'bay-1', 'typescript');
    expect(mockMonaco.languages.registerHoverProvider).toHaveBeenCalledWith(
      'typescript',
      expect.objectContaining({ provideHover: expect.any(Function) }),
    );
  });

  it('registers definition provider', () => {
    registerLspProviders(mockMonaco as any, 'bay-1', 'typescript');
    expect(mockMonaco.languages.registerDefinitionProvider).toHaveBeenCalledWith(
      'typescript',
      expect.objectContaining({ provideDefinition: expect.any(Function) }),
    );
  });

  it('returns disposables', () => {
    const disposables = registerLspProviders(mockMonaco as any, 'bay-1', 'typescript');
    expect(disposables.length).toBeGreaterThan(0);
  });
});
