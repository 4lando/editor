import * as monaco from 'monaco-editor';
import { debug } from '../debug';

// Define Lando theme colors
const landoTheme = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'f8f8f2' },
    { token: 'key', foreground: 'de3f8f' },
    { token: 'type.yaml', foreground: 'de3f8f' },
    { token: 'string.yaml', foreground: 'f1fa8c' },
    { token: 'number.yaml', foreground: 'bd93f9' },
    { token: 'keyword.yaml', foreground: 'bd93f9' },
    { token: 'comment.yaml', foreground: '6272a4', fontStyle: 'italic' },
    { token: 'operator.yaml', foreground: 'dd3f8f' },
    { token: 'delimiter.bracket', foreground: 'dd3f8f' },
    { token: 'delimiter.square', foreground: 'dd3f8f' },
  ],
  colors: {
    'editor.background': '#261D2D',
    'editor.foreground': '#f8f8f2',
    'editor.lineHighlightBackground': '#44475a60',
    'editor.selectionBackground': '#8be9fd40',
    'editor.inactiveSelectionBackground': '#8be9fd20',
    'editorCursor.foreground': '#f8f8f2',
    'editorWhitespace.foreground': '#44475a',
    'editorIndentGuide.background': '#44475a',
    'editorIndentGuide.activeBackground': '#6272a4',
    'editor.selectionHighlightBackground': '#424450',
    'editor.wordHighlightBackground': '#8be9fd20',
    'editor.wordHighlightStrongBackground': '#50fa7b50',
    'editorLineNumber.foreground': '#6272a4',
    'editorLineNumber.activeForeground': '#f8f8f2',
    'editorError.foreground': '#ff5555',
    'editorWarning.foreground': '#ffb86c',
    'editorInfo.foreground': '#8be9fd',
    'editorHint.foreground': '#50fa7b',
    'editorBracketMatch.background': '#44475a',
    'editorBracketMatch.border': '#dd3f8f',
    'editorHoverWidget.background': '#382A3D',
    'editorHoverWidget.border': '#de3f8f',
    'editorHoverWidget.foreground': '#f8f8f2',
    'editorHoverWidget.statusBarBackground': '#382A3D',
  },
};

export function initTheme() {
  debug.log('Registering Lando theme...');
  monaco.editor.defineTheme('lando', landoTheme);

  // Set initial Monaco theme based on current dark mode state
  const isDark = document.documentElement.classList.contains('dark');
  debug.log('Initial theme:', isDark ? 'dark' : 'light');

  // Listen for theme changes
  window.addEventListener('themechange', (e) => {
    const isDark = e.detail.isDark;
    debug.log('Theme changed to:', isDark ? 'dark' : 'light');

    // Update Monaco Editor theme
    const editors = monaco.editor.getEditors();
    editors.forEach(editor => {
      editor.updateOptions({
        theme: isDark ? 'lando' : 'vs',
      });
    });
  });
}
