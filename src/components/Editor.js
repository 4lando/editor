import * as monaco from 'monaco-editor';
import { TokenizationRegistry } from 'monaco-editor/esm/vs/editor/common/languages';
import { MarkerSeverity } from 'monaco-editor/esm/vs/platform/markers/common/markers';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution';
import { loadSchema, validateYaml, getHoverInfo } from '../schema';
import { debug } from '../debug';
import { formatYaml } from '../format';
import { showToast } from '../toast';
import { generateShareUrl, getSharedContent } from '../share';
import { showShareDialog } from '../dialog';
import { registerCompletionProvider } from '../completions';

export class Editor {
  constructor(container) {
    debug.log('Editor constructor called with container:', container);
    this.container = container;
    this.editor = null;
    this.setupMonacoWorkers();
  }

  // Setup Monaco workers
  setupMonacoWorkers() {
    debug.log('Setting up Monaco workers');
    self.MonacoEnvironment = {
      getWorker(_, label) {
        debug.log('Requesting worker for language:', label);
        if (label === 'json') {
          return new jsonWorker();
        }
        return new editorWorker();
      },
    };
  }

  // Initialize the editor
  async init() {
    try {
      debug.log('Initializing editor...');
      
      if (!this.container) {
        throw new Error('Editor container not found');
      }

      const isDark = document.documentElement.classList.contains('dark');
      debug.log('Current theme state:', isDark ? 'dark' : 'light');

      this.editor = monaco.editor.create(this.container, this.getEditorOptions());
      
      await this.setupEditorFeatures();
      this.setupEventListeners();
      this.handleSharedContent();
      this.setupUIComponents();

      const loader = document.getElementById('editor-loader');
      if (loader) {
        loader.classList.add('fade-out');
        setTimeout(() => loader.remove(), 300);
      }

      debug.log('Editor initialized successfully');
      return this.editor;
    } catch (error) {
      debug.error('Failed to initialize editor:', error);
      throw error;
    }
  }

  getEditorOptions() {
    return {
      value: this.getDefaultContent(),
      language: 'yaml',
      theme: document.documentElement.classList.contains('dark') ? 'lando' : 'vs',
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 18,
      lineNumbers: 'on',
      renderWhitespace: 'selection',
      tabSize: 2,
      fixedOverflowWidgets: true,
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      wordBasedSuggestions: false,
      parameterHints: { enabled: true },
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
      snippetOptions: { exitOnEnter: true },
    };
  }

  async setupEditorFeatures() {
    // Set up YAML tokenization
    const existingTokensProvider = TokenizationRegistry.get('yaml');
    if (existingTokensProvider) {
      const originalTokenize = existingTokensProvider.tokenize.bind(existingTokensProvider);
      monaco.languages.setMonarchTokensProvider('yaml', {
        ...existingTokensProvider,
        tokenize: (line, state) => {
          const tokens = originalTokenize(line, state);
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
      this.handleSchemaLoadFailure();
    } else {
      debug.log('Schema loaded successfully');
      this.setupSchemaValidation(schemaContent);
    }

    // Register YAML completion provider
    if (schemaContent) {
      registerCompletionProvider(schemaContent);
    }
  }

  handleSchemaLoadFailure() {
    debug.warn('Schema failed to load - editor will continue without validation');
    monaco.editor.setModelMarkers(this.editor.getModel(), 'yaml', [{
      severity: MarkerSeverity.Warning,
      message: 'Schema validation unavailable - schema failed to load',
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    }]);
  }

  setupSchemaValidation(schemaContent) {
    const updateDiagnostics = () => {
      const content = this.editor.getValue();
      try {
        debug.log('Validating YAML content...');
        const diagnostics = validateYaml(content, schemaContent);
        debug.log('Validation results:', diagnostics);
        monaco.editor.setModelMarkers(this.editor.getModel(), 'yaml', diagnostics);
      } catch (e) {
        debug.error('Validation error:', e);
      }
    };

    // Update diagnostics on content change
    this.editor.onDidChangeModelContent(() => {
      debug.log('Content changed, updating diagnostics...');
      updateDiagnostics();
    });

    // Initial validation
    updateDiagnostics();
  }

  setupEventListeners() {
    // Handle paste events
    this.editor.onDidPaste(this.handlePaste.bind(this));

    // Handle window resizing
    window.addEventListener('resize', () => {
      debug.log('Window resized, updating editor layout...');
      this.editor.layout();
    });

    // Set up drag and drop handling
    this.setupDragAndDrop();
  }

  handlePaste() {
    try {
      const content = this.editor.getValue();
      const formatted = formatYaml(content);
      
      // Only format and show toast if content changed
      if (formatted !== content) {
        this.editor.executeEdits('format', [{
          range: this.editor.getModel().getFullModelRange(),
          text: formatted,
        }]);
        showToast('Content was automatically formatted', 2000);
      }
    } catch (error) {
      debug.error('Failed to format pasted content:', error);
      showToast(`Failed to format: ${error.message}`, 5000);
    }
  }

  setupDragAndDrop() {
    this.container.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.container.classList.add('drag-over');
    });

    this.container.addEventListener('dragleave', () => {
      this.container.classList.remove('drag-over');
    });

    this.container.addEventListener('drop', this.handleFileDrop.bind(this));
  }

  async handleFileDrop(e) {
    e.preventDefault();
    this.container.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (!file) return;

    await this.handleFileLoad(file);
  }

  handleSharedContent() {
    const sharedContent = getSharedContent();
    if (sharedContent) {
      try {
        this.editor.setValue(sharedContent);
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
  }

  setupUIComponents() {
    const drawer = this.container.querySelector('.editor-drawer');
    this.setupMenuButton(drawer);
    this.setupFileHandling(drawer);
    this.setupFormatAction(drawer);
    this.setupShareButton(drawer);
  }

  getDefaultContent() {
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

  setupMenuButton(drawer) {
    const menuButton = document.getElementById('editor-menu-button');
    
    // Toggle drawer on menu button click
    menuButton.addEventListener('click', () => {
      drawer.classList.toggle('open');
    });

    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
      if (!drawer.contains(e.target) && !menuButton.contains(e.target)) {
        drawer.classList.remove('open');
      }
    });
  }

  setupFileHandling(drawer) {
    const fileInput = document.getElementById('file-input');
    const openFileBtn = document.getElementById('open-file-btn');
    const saveFileBtn = document.getElementById('save-file-btn');

    // Handle file opening
    openFileBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      await this.handleFileLoad(file);
      // Reset file input
      fileInput.value = '';
    });

    // Handle file saving
    saveFileBtn.addEventListener('click', () => {
      const content = this.editor.getValue();
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
  }

  async handleFileLoad(file) {
    // Check if it's a .lando.yml file
    if (!file.name.match(/^\.lando(\..*)?\.yml$/i)) {
      debug.warn('Invalid file type:', file.name);
      monaco.editor.setModelMarkers(this.editor.getModel(), 'yaml', [{
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
      this.editor.executeEdits('format', [{
        range: this.editor.getModel().getFullModelRange(),
        text: formatted,
      }]);
      debug.log('File loaded successfully:', file.name);
      this.container.querySelector('.editor-drawer').classList.remove('open');
    } catch (error) {
      debug.error('Error reading file:', error);
      monaco.editor.setModelMarkers(this.editor.getModel(), 'yaml', [{
        severity: MarkerSeverity.Error,
        message: `Error reading file: ${error.message}`,
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      }]);
    }
  }

  setupFormatAction(drawer) {
    const formatBtn = document.getElementById('format-btn');

    // Add format action to context menu
    this.editor.addAction({
      id: 'format-yaml',
      label: 'Format Document',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF
      ],
      contextMenuGroupId: '1_modification',
      contextMenuOrder: 1.5,
      run: () => this.formatDocument(drawer),
    });

    // Handle format button click
    formatBtn.addEventListener('click', () => this.formatDocument(drawer));
  }

  formatDocument(drawer) {
    try {
      const content = this.editor.getValue();
      const formatted = formatYaml(content);
      // Use editor.executeEdits to preserve undo history
      this.editor.executeEdits('format', [{
        range: this.editor.getModel().getFullModelRange(),
        text: formatted,
      }]);
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
      monaco.editor.setModelMarkers(this.editor.getModel(), 'yaml', [{
        severity: MarkerSeverity.Error,
        message: `Failed to format: ${error.message}`,
        startLineNumber: startLine,
        startColumn: startCol,
        endLineNumber: startLine,
        endColumn: startCol + 1,
      }]);
    }
  }

  setupShareButton(drawer) {
    const shareBtn = document.getElementById('share-btn');

    shareBtn.addEventListener('click', () => {
      try {
        const content = this.editor.getValue();
        const shareUrl = generateShareUrl(content);
        showShareDialog(shareUrl);
        drawer.classList.remove('open');
      } catch (error) {
        debug.error('Failed to share:', error);
        showToast('Failed to generate share URL', 5000);
      }
    });
  }
} 