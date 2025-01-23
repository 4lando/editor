import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import * as monaco from 'monaco-editor';
import { TokenizationRegistry } from 'monaco-editor/esm/vs/editor/common/languages';
import { MarkerSeverity } from 'monaco-editor/esm/vs/platform/markers/common/markers';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution';
import { loadSchema, validateYaml, getHoverInfo } from '../../schema';
import { debug } from '../../debug';
import { formatYaml, setupYamlFormatting } from '../../lib/format-yaml';
import { useToast } from "@/hooks/use-toast"
import { generateShareUrl, getSharedContent } from '../../share';
import { showShareDialog } from '../../lib/dialog';
import { registerCompletionProvider } from '../../completions';
import { EditorMenu } from './editor-menu';

export function Editor() {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const initializingRef = useRef(false);
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Setup Monaco workers
  const setupMonacoWorkers = () => {
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
  };

  useEffect(() => {
    // Wait for next frame to ensure container is ready
    requestAnimationFrame(() => {
      const initEditor = async () => {
        if (initializingRef.current) return;
        initializingRef.current = true;

        try {
          debug.log('Initializing editor...');
          if (!containerRef.current) {
            throw new Error('Editor container not found');
          }

          setupMonacoWorkers();
          editorRef.current = monaco.editor.create(containerRef.current, getEditorOptions());
          await setupEditorFeatures();
          setupEventListeners();
          handleSharedContent();
          setIsEditorReady(true);

          // Fade out loader
          setTimeout(() => {
            const loader = document.getElementById('editor-loader');
            if (loader) {
              loader.style.opacity = '0';
              loader.addEventListener('transitionend', () => loader.remove());
            }
          }, 500);

          debug.log('Editor initialized successfully');
        } catch (error) {
          debug.error('Failed to initialize editor:', error);
          throw error;
        }
      };

      initEditor();
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMenuOpen && !e.target.closest('.editor-drawer') && !e.target.closest('#editor-menu-button')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen]);

  const getEditorOptions = () => ({
    value: getDefaultContent(),
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
  });

  const setupEditorFeatures = async () => {
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
      handleSchemaLoadFailure();
    } else {
      debug.log('Schema loaded successfully');
      setupSchemaValidation(schemaContent);
    }

    // Register YAML completion provider
    if (schemaContent) {
      registerCompletionProvider(schemaContent);
    }

    // Add format action setup
    setupYamlFormatting(editorRef.current, toast);
  };

  const handleSchemaLoadFailure = () => {
    debug.warn('Schema failed to load - editor will continue without validation');
    monaco.editor.setModelMarkers(editorRef.current.getModel(), 'yaml', [{
      severity: MarkerSeverity.Warning,
      message: 'Schema validation unavailable - schema failed to load',
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: 1,
    }]);
  };

  const setupSchemaValidation = (schemaContent) => {
    const updateDiagnostics = () => {
      const content = editorRef.current.getValue();
      try {
        debug.log('Validating YAML content...');
        const diagnostics = validateYaml(content, schemaContent);
        debug.log('Validation results:', diagnostics);
        monaco.editor.setModelMarkers(editorRef.current.getModel(), 'yaml', diagnostics);
      } catch (e) {
        debug.error('Validation error:', e);
      }
    };

    // Update diagnostics on content change
    editorRef.current.onDidChangeModelContent(() => {
      debug.log('Content changed, updating diagnostics...');
      updateDiagnostics();
    });

    // Initial validation
    updateDiagnostics();
  };

  const handleSharedContent = () => {
    const sharedContent = getSharedContent();
    if (sharedContent) {
      try {
        editorRef.current.setValue(sharedContent);
        toast({
          description: 'Loaded shared Landofile',
          duration: 2000,
        });
        // Clear the URL parameter without reloading the page
        const url = new URL(window.location.href);
        url.searchParams.delete('s');
        window.history.replaceState({}, '', url.toString());
      } catch (error) {
        debug.error('Failed to load shared content:', error);
        toast({
          description: 'Failed to load shared content',
          duration: 5000,
          className: 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200',
        });
      }
    }
  };

  const getDefaultContent = () => {
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
  };

  const setupEventListeners = () => {
    // Handle paste events
    editorRef.current.onDidPaste(() => {
      try {
        const content = editorRef.current.getValue();
        const formatted = formatYaml(content);

        // Only format and show toast if content changed
        if (formatted !== content) {
          editorRef.current.executeEdits('format', [{
            range: editorRef.current.getModel().getFullModelRange(),
            text: formatted,
          }]);
          toast({
            description: 'Content was automatically formatted',
            duration: 2000,
          });
        }
      } catch (error) {
        debug.error('Failed to format pasted content:', error);
        toast({
          description: `Failed to format: ${error.message}`,
          duration: 5000,
          className: 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200',
        });
      }
    });

    // Handle window resizing
    window.addEventListener('resize', () => {
      debug.log('Window resized, updating editor layout...');
      editorRef.current.layout();
    });

    // Update drag and drop handling to target the main container
    const editorContainer = containerRef.current;
    if (editorContainer) {
      editorContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        editorContainer.classList.add('drag-over');
      });

      editorContainer.addEventListener('dragleave', () => {
        editorContainer.classList.remove('drag-over');
      });

      editorContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        editorContainer.classList.remove('drag-over');

        const file = e.dataTransfer.files[0];
        if (!file) return;

        if (!file.name.match(/^\.lando(\..*)?\.yml$/i)) {
          debug.warn('Invalid file type:', file.name);
          monaco.editor.setModelMarkers(editorRef.current.getModel(), 'yaml', [{
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
          const formatted = formatYaml(content);
          if (formatted !== content) {
            toast({
              description: 'File was automatically formatted',
              duration: 2000,
            });
          }
          editorRef.current.executeEdits('format', [{
            range: editorRef.current.getModel().getFullModelRange(),
            text: formatted,
          }]);
          debug.log('File loaded successfully:', file.name);
        } catch (error) {
          debug.error('Error reading file:', error);
          toast({
            description: `Error reading file: ${error.message}`,
            duration: 5000,
            className: 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200',
          });
          monaco.editor.setModelMarkers(editorRef.current.getModel(), 'yaml', [{
            severity: MarkerSeverity.Error,
            message: `Error reading file: ${error.message}`,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
          }]);
        }
      });
    }
  };

  return (
    <div className="editor-container absolute inset-0">
      <div
        ref={containerRef}
        className="monaco-editor-container absolute inset-0 bg-transparent"
        style={{ width: '100%', height: '100%' }}
      />
      <button
        id="editor-menu-button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="absolute top-2 right-2 z-20 p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors dark:bg-black/20 dark:hover:bg-black/40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>
      {editorRef.current && (
        <EditorMenu
          editor={editorRef.current}
          toast={toast}
          isOpen={isMenuOpen}
          onToggle={setIsMenuOpen}
        />
      )}
    </div>
  );
}
