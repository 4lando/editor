import { getSharedContent } from "@/lib/share";
import { loadEditorContent } from "@/lib/storage";
import landofileExample from "@/templates/example-landofile.yml?raw";

/**
 * Returns the configuration options for the Monaco editor instance
 * @returns {import('monaco-editor').editor.IStandaloneEditorConstructionOptions}
 */
const getEditorOptions = () => ({
  value: getDefaultContent(),
  language: "yaml",
  theme: document.documentElement.classList.contains("dark") ? "lando" : "vs",
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 18,
  lineNumbers: "on",
  renderWhitespace: "selection",
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
    insertMode: "insert",
    insertHighlight: true,
    selectionMode: "always",
  },
  acceptSuggestionOnEnter: "on",
  acceptSuggestionOnCommitCharacter: true,
  snippetSuggestions: "inline",
  tabCompletion: "on",
  snippetOptions: { exitOnEnter: true },
});

/**
 * Returns the initial content for the editor
 * Priority: URL shared content > localStorage > default template
 * @returns {string} The initial editor content
 */
const getDefaultContent = () => {
  // First try to load shared content
  const sharedContent = getSharedContent();
  if (sharedContent) {
    return sharedContent;
  }

  // Then try to load from local storage
  const savedContent = loadEditorContent();
  if (savedContent) {
    return savedContent;
  }

  // Fall back to example template
  return landofileExample;
};

export { getEditorOptions, getDefaultContent };
