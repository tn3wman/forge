import { renderHook, act } from '@testing-library/react';
import { useEditorModels } from '../useEditorModels';

const createMockModel = () => ({
  getValue: vi.fn(() => 'content'),
  getAlternativeVersionId: vi.fn(() => 1),
  onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })),
  dispose: vi.fn(),
  isDisposed: vi.fn(() => false),
});

const createMockMonaco = (mockModel: ReturnType<typeof createMockModel>) => ({
  editor: {
    createModel: vi.fn(() => mockModel),
    getModel: vi.fn(() => null),
  },
  Uri: { file: vi.fn((p: string) => ({ path: p })) },
});

describe('useEditorModels', () => {
  it('creates a model for a new file', () => {
    const mockModel = createMockModel();
    const mockMonaco = createMockMonaco(mockModel);
    const { result } = renderHook(() => useEditorModels());
    act(() => {
      result.current.getOrCreateModel(mockMonaco as any, '/test.ts', 'code', 'typescript');
    });
    expect(mockMonaco.editor.createModel).toHaveBeenCalledWith('code', 'typescript', {
      path: '/test.ts',
    });
  });

  it('returns existing model for same path', () => {
    const mockModel = createMockModel();
    const mockMonaco = createMockMonaco(mockModel);
    const { result } = renderHook(() => useEditorModels());
    let model1: any, model2: any;
    act(() => {
      model1 = result.current.getOrCreateModel(mockMonaco as any, '/test.ts', 'code', 'typescript');
    });
    act(() => {
      model2 = result.current.getOrCreateModel(mockMonaco as any, '/test.ts', 'code', 'typescript');
    });
    expect(mockMonaco.editor.createModel).toHaveBeenCalledTimes(1);
    expect(model1).toBe(model2);
  });

  it('disposes model on cleanup', () => {
    const mockModel = createMockModel();
    const mockMonaco = createMockMonaco(mockModel);
    const { result } = renderHook(() => useEditorModels());
    act(() => {
      result.current.getOrCreateModel(mockMonaco as any, '/test.ts', 'code', 'typescript');
    });
    act(() => {
      result.current.disposeModel('/test.ts');
    });
    expect(mockModel.dispose).toHaveBeenCalled();
  });

  it('tracks dirty state via onDidChangeContent', () => {
    const mockModel = createMockModel();
    const mockMonaco = createMockMonaco(mockModel);
    const { result } = renderHook(() => useEditorModels());
    act(() => {
      result.current.getOrCreateModel(mockMonaco as any, '/test.ts', 'code', 'typescript');
    });
    // Simulate content change by calling the callback passed to onDidChangeContent
    const changeCallback = mockModel.onDidChangeContent.mock.calls[0][0];
    act(() => changeCallback());
    expect(result.current.isDirty('/test.ts')).toBe(true);
  });

  it('marks file clean after markClean', () => {
    const mockModel = createMockModel();
    const mockMonaco = createMockMonaco(mockModel);
    const { result } = renderHook(() => useEditorModels());
    act(() => {
      result.current.getOrCreateModel(mockMonaco as any, '/test.ts', 'code', 'typescript');
    });
    const changeCallback = mockModel.onDidChangeContent.mock.calls[0][0];
    act(() => changeCallback());
    act(() => result.current.markClean('/test.ts'));
    expect(result.current.isDirty('/test.ts')).toBe(false);
  });
});
