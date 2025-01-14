import * as monaco from 'monaco-editor';
import { TokenizationRegistry } from 'monaco-editor/esm/vs/editor/common/languages';
import { MarkerSeverity } from 'monaco-editor/esm/vs/platform/markers/common/markers';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution';
import { loadSchema, validateYaml, getHoverInfo, getCompletionItems } from './schema';
import { debug } from './debug';
import { initTheme } from './theme';
import { formatYaml } from './format';
import { showToast } from './toast';
import { generateShareUrl, getSharedContent } from './share';
import { showShareDialog } from './dialog';
import { registerCompletionProvider } from './completions';

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

    // Add debug logging for theme state
    const isDark = document.documentElement.classList.contains('dark');
    debug.log('Current theme state:', isDark ? 'dark' : 'light');

    // Create the editor first, so it's available even if schema fails
    debug.log('Creating Monaco editor instance...');
    const editor = monaco.editor.create(container, {
      value: getDefaultContent(),
      language: 'yaml',
      theme: document.documentElement.classList.contains('dark') ? 'lando' : 'vs',
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
      // Suggestion settings
      quickSuggestions: true, // Simplified this
      suggestOnTriggerCharacters: true,
      wordBasedSuggestions: false, // Changed to boolean
      parameterHints: {
        enabled: true,
      },
      suggest: {
        snippetsPreventQuickSuggestions: false,
        showWords: false,
        filterGraceful: false,
        showSnippets: true,
        showProperties: true,
        localityBonus: true,
        insertMode: 'insert',
        insertHighlight: true,
        selectionMode: 'always',
      },
      acceptSuggestionOnEnter: 'on',
      acceptSuggestionOnCommitCharacter: true,
      snippetSuggestions: 'inline',
      tabCompletion: 'on',
      snippetOptions: {
        exitOnEnter: true,
      },
    });

    // Handle paste events
    editor.onDidPaste((e) => {
      try {
        const content = editor.getValue();
        const formatted = formatYaml(content);
        
        // Only format and show toast if content changed
        if (formatted !== content) {
          editor.executeEdits('format', [{
            range: editor.getModel().getFullModelRange(),
            text: formatted,
          }]);
          showToast('Content was automatically formatted', 2000);
        }
      } catch (error) {
        debug.error('Failed to format pasted content:', error);
        showToast(`Failed to format: ${error.message}`, 5000);
      }
    });

    // Check for shared content
    const sharedContent = getSharedContent();
    if (sharedContent) {
      try {
        editor.setValue(sharedContent);
        showToast('Loaded shared Landofile', 2000);
        // Clear the URL parameter without reloading the page
        const url = new URL(window.location.href);
        url.searchParams.delete('s');
        window.history.replaceState({}, '', url.toString());
      } catch (error) {
        debug.error('Failed to load shared content:', error);
        showToast('Failed to load shared content', 5000);
      }
    }

    // Get the existing YAML configuration
    const existingTokensProvider = TokenizationRegistry.get('yaml');

    if (existingTokensProvider) {
      const originalTokenize = existingTokensProvider.tokenize.bind(existingTokensProvider);
      
      monaco.languages.setMonarchTokensProvider('yaml', {
        ...existingTokensProvider,
        tokenize: (line, state) => {
          const tokens = originalTokenize(line, state);
          
          // Modify tokens to match our theme's token names
          if (tokens && tokens.tokens) {
            tokens.tokens = tokens.tokens.map(token => {
              if (token.scopes.includes('type.yaml')) {
                return { ...token, scopes: ['key'] };
              }
              return token;
            });
          }
          
          return tokens;
        },
      });
    }

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

    // Add drag and drop handling
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      container.classList.add('drag-over');
    });

    container.addEventListener('dragleave', () => {
      container.classList.remove('drag-over');
    });

    container.addEventListener('drop', async (e) => {
      e.preventDefault();
      container.classList.remove('drag-over');

      const file = e.dataTransfer.files[0];
      if (!file) return;

      // Check if it's a .lando.yml file
      if (!file.name.match(/^\.lando(\..*)?\.yml$/i)) {
        debug.warn('Invalid file type:', file.name);
        // Show error message
        monaco.editor.setModelMarkers(editor.getModel(), 'yaml', [{
          severity: MarkerSeverity.Error,
          message: 'Only .lando.yml and .lando.*.yml files are supported',
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
        }]);
        return;
      }

      try {
        const content = await file.text();
        // Format content before setting it
        const formatted = formatYaml(content);
        // Only show toast if formatting made changes
        if (formatted !== content) {
          showToast('File was automatically formatted', 2000);
        }
        editor.executeEdits('format', [{
          range: editor.getModel().getFullModelRange(),
          text: formatted,
        }]);
        debug.log('File loaded successfully:', file.name);
        drawer.classList.remove('open');
      } catch (error) {
        debug.error('Error reading file:', error);
        monaco.editor.setModelMarkers(editor.getModel(), 'yaml', [{
          severity: MarkerSeverity.Error,
          message: `Error reading file: ${error.message}`,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
        }]);
      }
    });

    // Hide the loader after everything is initialized
    const loader = document.getElementById('editor-loader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => loader.remove(), 300); // Remove after fade animation
    }

    debug.log('Editor initialized successfully');

    const menuButton = document.getElementById('editor-menu-button');
    const drawer = container.querySelector('.editor-drawer');
    const fileInput = document.getElementById('file-input');
    const openFileBtn = document.getElementById('open-file-btn');
    const saveFileBtn = document.getElementById('save-file-btn');
    const formatBtn = document.getElementById('format-btn');
    const shareBtn = document.getElementById('share-btn');

    // Handle file opening
    openFileBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Check if it's a .lando.yml file
      if (!file.name.match(/^\.lando(\..*)?\.yml$/i)) {
        debug.warn('Invalid file type:', file.name);
        monaco.editor.setModelMarkers(editor.getModel(), 'yaml', [{
          severity: MarkerSeverity.Error,
          message: 'Only .lando.yml and .lando.*.yml files are supported',
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
        }]);
        return;
      }

      try {
        const content = await file.text();
        // Format content before setting it
        const formatted = formatYaml(content);
        // Only show toast if formatting made changes
        if (formatted !== content) {
          showToast('File was automatically formatted', 2000);
        }
        editor.executeEdits('format', [{
          range: editor.getModel().getFullModelRange(),
          text: formatted,
        }]);
        debug.log('File loaded successfully:', file.name);
        drawer.classList.remove('open');
      } catch (error) {
        debug.error('Error reading file:', error);
        monaco.editor.setModelMarkers(editor.getModel(), 'yaml', [{
          severity: MarkerSeverity.Error,
          message: `Error reading file: ${error.message}`,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
        }]);
      }
      // Reset file input
      fileInput.value = '';
    });

    // Handle file saving
    saveFileBtn.addEventListener('click', () => {
      const content = editor.getValue();
      const blob = new Blob([content], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '_.lando.yml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      drawer.classList.remove('open');
      
      showToast('Remember to remove the underscore from "_.lando.yml" after downloading', 5000);
    });

    // Add format action to context menu
    editor.addAction({
      id: 'format-yaml',
      label: 'Format Document',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF
      ],
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 1.5,
      run: function(ed) {
        try {
          const content = ed.getValue();
          const formatted = formatYaml(content);
          // Use editor.executeEdits to preserve undo history
          ed.executeEdits('format', [
            {
              range: ed.getModel().getFullModelRange(),
              text: formatted,
            }
          ]);
          debug.log('YAML formatted successfully');
          drawer.classList.remove('open');
          showToast('Document formatted successfully', 2000);
        } catch (error) {
          debug.error('Format failed:', error);
          // Try to get the line and column from the error if available
          const errorMatch = error.message.match(/at line (\d+), column (\d+)/i);
          const startLine = errorMatch ? parseInt(errorMatch[1]) : 1;
          const startCol = errorMatch ? parseInt(errorMatch[2]) : 1;
          
          showToast(`Failed to format: ${error.message}`, 5000);
          monaco.editor.setModelMarkers(ed.getModel(), 'yaml', [{
            severity: MarkerSeverity.Error,
            message: `Failed to format: ${error.message}`,
            startLineNumber: startLine,
            startColumn: startCol,
            endLineNumber: startLine,
            endColumn: startCol + 1,
          }]);
        }
      }
    });

    // Handle format button click
    formatBtn.addEventListener('click', () => {
      try {
        const content = editor.getValue();
        const formatted = formatYaml(content);
        // Use editor.executeEdits to preserve undo history
        editor.executeEdits('format', [
          {
            range: editor.getModel().getFullModelRange(),
            text: formatted,
          }
        ]);
        debug.log('YAML formatted successfully');
        drawer.classList.remove('open');
        showToast('Document formatted successfully', 2000);
      } catch (error) {
        debug.error('Format failed:', error);
        showToast(`Failed to format: ${error.message}`, 5000);
        monaco.editor.setModelMarkers(editor.getModel(), 'yaml', [{
          severity: MarkerSeverity.Error,
          message: `Failed to format: ${error.message}`,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
        }]);
      }
    });

    // Handle share button click
    shareBtn.addEventListener('click', () => {
      try {
        const content = editor.getValue();
        const shareUrl = generateShareUrl(content);
        showShareDialog(shareUrl);
        drawer.classList.remove('open');
      } catch (error) {
        debug.error('Failed to share:', error);
        showToast('Failed to generate share URL', 5000);
      }
    });

    menuButton.addEventListener('click', () => {
      drawer.classList.toggle('open');
    });

    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
      if (!drawer.contains(e.target) && !menuButton.contains(e.target)) {
        drawer.classList.remove('open');
      }
    });

    // Register YAML completion provider after schema is loaded
    const schema = await loadSchema();
    if (schema) {
      registerCompletionProvider(schema);
    }

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