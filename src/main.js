import * as monaco from 'monaco-editor';
import { MarkerSeverity } from 'monaco-editor/esm/vs/editor/editor.api';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution';
import { loadSchema, validateYaml, getHoverInfo } from './schema';
import { debug } from './debug';
import { initTheme } from './theme';

// Initialize theme before editor
initTheme();

// Set up Monaco workers
self.MonacoEnvironment = {
  getWorker(_, label) {
    debug.log('Requesting worker for language:', label);
    if (label === 'json') {
      return new jsonWorker();
    }
    return new editorWorker();
  },
};

// Initialize the editor
async function initEditor() {
  try {
    debug.log('Initializing editor...');
    
    // Wait for the container to be available
    const container = document.getElementById('editor');
    if (!container) {
      throw new Error('Editor container not found');
    }

    // Create the editor first, so it's available even if schema fails
    debug.log('Creating Monaco editor instance...');
    const isDark = document.documentElement.classList.contains('dark');
    const editor = monaco.editor.create(container, {
      value: getDefaultContent(),
      language: 'yaml',
      theme: isDark ? 'lando' : 'vs',
      automaticLayout: true,
      minimap: {
        enabled: false,
      },
      scrollBeyondLastLine: false,
      fontSize: 18,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      tabSize: 2,
      fixedOverflowWidgets: true,
    });

    // Register YAML language support
    debug.log('Registering YAML language support...');
    monaco.languages.register({ id: 'yaml' });
    monaco.languages.setMonarchTokensProvider('yaml', {
      defaultToken: '',
      tokenPostfix: '.yaml',

      // Shared definitions
      brackets: [
        { token: 'delimiter.bracket', open: '{', close: '}' },
        { token: 'delimiter.square', open: '[', close: ']' }
      ],

      keywords: ['true', 'false', 'null', 'undefined'],

      // Tokenizer
      tokenizer: {
        root: [
          // Key-value pairs
          [/^(\s*)([-]?)(\s*)([^:]*?)(:)( |$)/, ['white', 'operator', 'white', 'key', 'operator', 'white']],
          
          // Comments
          [/#.*$/, 'comment'],
          
          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+/, 'number'],
          
          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
          
          // Whitespace
          [/[ \t\r\n]+/, 'white'],
        ],

        string_double: [
          [/[^\\"]+/, 'string'],
          [/"/, 'string', '@pop'],
          [/\\[^]/, 'string.escape']
        ],

        string_single: [
          [/[^\\']+/, 'string'],
          [/'/, 'string', '@pop'],
          [/\\[^]/, 'string.escape']
        ]
      }
    });

    // Register hover provider
    monaco.languages.registerHoverProvider('yaml', {
      provideHover: (model, position) => {
        const content = model.getValue();
        return getHoverInfo(content, position);
      }
    });

    // Load schema and set up validation
    debug.log('Loading schema...');
    const schemaContent = await loadSchema();
    
    if (!schemaContent) {
      debug.warn('Schema failed to load - editor will continue without validation');
      monaco.editor.setModelMarkers(editor.getModel(), 'yaml', [{
        severity: MarkerSeverity.Warning,
        message: 'Schema validation unavailable - schema failed to load',
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      }]);
    } else {
      debug.log('Schema loaded successfully');
      
      // Set up diagnostics for YAML validation
      const updateDiagnostics = () => {
        const content = editor.getValue();
        try {
          debug.log('Validating YAML content...');
          const diagnostics = validateYaml(content, schemaContent);
          debug.log('Validation results:', diagnostics);
          monaco.editor.setModelMarkers(editor.getModel(), 'yaml', diagnostics);
        } catch (e) {
          debug.error('Validation error:', e);
        }
      };

      // Update diagnostics on content change
      editor.onDidChangeModelContent(() => {
        debug.log('Content changed, updating diagnostics...');
        updateDiagnostics();
      });

      // Initial validation
      updateDiagnostics();
    }

    // Handle window resizing
    window.addEventListener('resize', () => {
      debug.log('Window resized, updating editor layout...');
      editor.layout();
    });

    debug.log('Editor initialized successfully');
    return editor;
  } catch (error) {
    debug.error('Failed to initialize editor:', error);
    throw error;
  }
}

function getDefaultContent() {
  return `name: my-lando-app
recipe: lamp
config:
  php: '8.3'
  webroot: .
  database: mysql:8.0
  xdebug: false

services:
  node:
    type: node:20
    build:
      - npm install
    command: vite --host 0.0.0.0
    port: 5173
    ssl: true
`;
}

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditor);
} else {
  initEditor();
} 