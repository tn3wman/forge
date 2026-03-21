import type { editor } from 'monaco-editor';

export const FORGE_DARK_THEME: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#18181b',
    'editor.foreground': '#e4e4e7',
    'editorLineNumber.foreground': '#52525b',
    'editorLineNumber.activeForeground': '#a1a1aa',
    'editor.selectionBackground': '#3f3f4640',
    'editor.lineHighlightBackground': '#27272a',
    'editorCursor.foreground': '#818cf8',
  },
};
