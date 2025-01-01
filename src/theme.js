import * as monaco from 'monaco-editor';
import { debug } from './debug';

// Define Lando theme colors
const landoTheme = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'f8f8f2' },
    { token: 'key', foreground: 'df4090' },
    { token: 'type.yaml', foreground: 'df4090' },
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
    'editor.lineHighlightBackground': '#44475a',
    'editor.selectionBackground': '#44475a',
    'editor.inactiveSelectionBackground': '#44475a80',
    'editorCursor.foreground': '#f8f8f2',
    'editorWhitespace.foreground': '#44475a',
    'editorIndentGuide.background': '#44475a',
    'editorIndentGuide.activeBackground': '#6272a4',
    'editor.selectionHighlightBackground': '#424450',
    'editor.wordHighlightBackground': '#8be9fd50',
    'editor.wordHighlightStrongBackground': '#50fa7b50',
    'editorLineNumber.foreground': '#6272a4',
    'editorLineNumber.activeForeground': '#f8f8f2',
    'editorError.foreground': '#ff5555',
    'editorWarning.foreground': '#ffb86c',
    'editorInfo.foreground': '#8be9fd',
    'editorHint.foreground': '#50fa7b',
    'editorBracketMatch.background': '#44475a',
    'editorBracketMatch.border': '#dd3f8f',
  },
};

export function initTheme() {
  debug.log('Registering Lando theme...');
  monaco.editor.defineTheme('lando', landoTheme);
  
  // Set Monaco's default theme immediately
  monaco.editor.setTheme('lando');

  // Check for saved theme preference or use system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Set initial theme
  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    document.documentElement.classList.add('dark');
    monaco.editor.setTheme('lando');
    debug.log('Initial theme: dark');
  } else {
    monaco.editor.setTheme('vs');
    debug.log('Initial theme: light');
  }

  // Theme toggle button handler
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      debug.log('Theme toggled to:', isDark ? 'dark' : 'light');
      
      // Update Monaco Editor theme
      const editors = monaco.editor.getEditors();
      editors.forEach(editor => {
        editor.updateOptions({
          theme: isDark ? 'lando' : 'vs',
        });
      });
    });
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      const shouldBeDark = e.matches;
      document.documentElement.classList.toggle('dark', shouldBeDark);
      debug.log('System theme changed to:', shouldBeDark ? 'dark' : 'light');
      
      // Update Monaco Editor theme
      const editors = monaco.editor.getEditors();
      editors.forEach(editor => {
        editor.updateOptions({
          theme: shouldBeDark ? 'lando' : 'vs',
        });
      });
    }
  });
} 