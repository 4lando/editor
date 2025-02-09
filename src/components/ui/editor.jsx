import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import { MarkerSeverity } from "monaco-editor/esm/vs/platform/markers/common/markers";
import React, { useEffect, useRef, useState } from "react";
import "monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution";
import { useToast } from "@/hooks/use-toast";
import { debug } from "@/lib/debug";
import { getEditorOptions } from "@/lib/editor-config";
import { formatYaml } from "@/lib/format-yaml";
import { compiledSchema, setupEditorFeatures, updateDiagnostics } from "@/lib/schema-validation";
import { getSharedContent } from "@/lib/share";
import { saveEditorContent } from "@/lib/storage";
import { EditorMenu } from "./editor-menu";

/**
 * @fileoverview
 * Monaco Editor component for Lando configuration files.
 * This component provides a full-featured YAML editor with Lando-specific functionality,
 * including schema validation, autocompletion, and custom formatting.
 * It handles file drag-and-drop, content sharing, and local storage persistence.
 */

/**
 * Configures Monaco editor web workers for JSON and general editor functionality
 */
const setupMonacoWorkers = () => {
  debug.log("Setting up Monaco workers");
  self.MonacoEnvironment = {
    getWorker(_, label) {
      debug.log("Requesting worker for language:", label);
      if (label === "json") {
        return new jsonWorker();
      }
      return new editorWorker();
    },
  };
};

/**
 * A Monaco-based YAML editor component specialized for Lando configuration files.
 * Provides features including:
 * - Syntax highlighting
 * - Schema validation
 * - Auto-completion
 * - File drag & drop
 * - Content sharing
 * - Local storage persistence
 * - Auto-formatting
 *
 * @returns {JSX.Element} The editor component
 */
export function Editor() {
  /**
   * Reference to the DOM container element for the Monaco editor
   * @type {React.RefObject<HTMLDivElement>}
   */
  const containerRef = useRef(null);

  /**
   * Reference to the Monaco editor instance
   * @type {React.RefObject<import('monaco-editor').editor.IStandaloneCodeEditor>}
   */
  const editorRef = useRef(null);

  /**
   * Flag to prevent multiple editor initializations
   * @type {React.RefObject<boolean>}
   */
  const initializingRef = useRef(false);

  /**
   * Toast notification hook for displaying user feedback
   */
  const { toast } = useToast();

  /**
   * State for controlling the editor menu visibility
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /**
   * State indicating whether the editor has completed initialization
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [isEditorReady, setIsEditorReady] = useState(false);

  /**
   * Effect hook for initializing the Monaco editor
   * Sets up the editor instance, workers, and features
   */
  useEffect(() => {
    // Wait for next frame to ensure container is ready
    requestAnimationFrame(() => {
      const initEditor = async () => {
        if (initializingRef.current) return;
        initializingRef.current = true;

        try {
          debug.log("Initializing editor...");
          if (!containerRef.current) {
            throw new Error("Editor container not found");
          }

          setupMonacoWorkers();
          editorRef.current = monaco.editor.create(containerRef.current, getEditorOptions());
          await setupEditorFeatures(editorRef.current, toast);
          setupEventListeners();
          handleSharedContent();
          setIsEditorReady(true);

          // Fade out loader
          setTimeout(() => {
            const loader = document.getElementById("editor-loader");
            if (loader) {
              loader.style.opacity = "0";
              loader.addEventListener("transitionend", () => loader.remove());
            }
          }, 500);

          debug.log("Editor initialized successfully");
        } catch (error) {
          debug.error("Failed to initialize editor:", error);
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
  }, [toast]);

  /**
   * Effect hook for handling clicks outside the editor menu
   * Closes the menu when clicking outside its boundaries
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMenuOpen && !e.target.closest(".editor-drawer") && !e.target.closest("#editor-menu-button")) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isMenuOpen]);

  /**
   * Handles shared content from URL parameters
   * Loads the content into the editor and shows a notification
   */
  const handleSharedContent = () => {
    const sharedContent = getSharedContent();
    if (sharedContent) {
      try {
        editorRef.current.setValue(sharedContent);
        toast({
          description: "Loaded shared Landofile",
          duration: 2000,
        });
        // Clear the URL parameter without reloading the page
        const url = new URL(window.location.href);
        url.searchParams.delete("s");
        window.history.replaceState({}, "", url.toString());
      } catch (error) {
        debug.error("Failed to load shared content:", error);
        toast({
          description: "Failed to load shared content",
          duration: 5000,
          className: "bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200",
        });
      }
    }
  };

  /**
   * Sets up event listeners for the editor including:
   * - Paste formatting
   * - Window resize handling
   * - File drag and drop
   * - Content change persistence
   */
  const setupEventListeners = () => {
    // Handle paste events
    editorRef.current.onDidPaste(() => {
      try {
        const content = editorRef.current.getValue();
        const formatted = formatYaml(content);

        // Only format and show toast if content changed
        if (formatted !== content) {
          editorRef.current.executeEdits("format", [
            {
              range: editorRef.current.getModel().getFullModelRange(),
              text: formatted,
            },
          ]);
          toast({
            description: "Content was automatically formatted",
            duration: 2000,
          });
        }
      } catch (error) {
        debug.error("Failed to format pasted content:", error);
        toast({
          description: `Failed to format: ${error.message}`,
          duration: 5000,
          className: "bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200",
        });
      }
    });

    // Handle window resizing
    window.addEventListener("resize", () => {
      debug.log("Window resized, updating editor layout...");
      editorRef.current.layout();
    });

    // Update drag and drop handling to target the main container
    const editorContainer = containerRef.current;
    if (editorContainer) {
      editorContainer.addEventListener("dragover", (e) => {
        e.preventDefault();
        editorContainer.classList.add("drag-over");
      });

      editorContainer.addEventListener("dragleave", () => {
        editorContainer.classList.remove("drag-over");
      });

      editorContainer.addEventListener("drop", async (e) => {
        e.preventDefault();
        editorContainer.classList.remove("drag-over");

        const file = e.dataTransfer.files[0];
        if (!file) return;

        if (!file.name.match(/^\.lando(\..*)?\.yml$/i)) {
          debug.warn("Invalid file type:", file.name);
          monaco.editor.setModelMarkers(editorRef.current.getModel(), "yaml", [
            {
              severity: MarkerSeverity.Error,
              message: "Only .lando.yml and .lando.*.yml files are supported",
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 1,
            },
          ]);
          return;
        }

        try {
          const content = await file.text();
          const formatted = formatYaml(content);
          if (formatted !== content) {
            toast({
              description: "File was automatically formatted",
              duration: 2000,
            });
          }
          editorRef.current.executeEdits("format", [
            {
              range: editorRef.current.getModel().getFullModelRange(),
              text: formatted,
            },
          ]);
          debug.log("File loaded successfully:", file.name);
        } catch (error) {
          debug.error("Error reading file:", error);
          toast({
            description: `Error reading file: ${error.message}`,
            duration: 5000,
            className: "bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200",
          });
          monaco.editor.setModelMarkers(editorRef.current.getModel(), "yaml", [
            {
              severity: MarkerSeverity.Error,
              message: `Error reading file: ${error.message}`,
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: 1,
            },
          ]);
        }
      });
    }

    // Add content change listener to save to localStorage
    editorRef.current.onDidChangeModelContent(() => {
      debug.log("Content changed, saving to localStorage...");
      const content = editorRef.current.getValue();
      saveEditorContent(content);

      if (typeof updateDiagnostics === "function" && compiledSchema) {
        // Only call updateDiagnostics if it's available and we have a schema
        updateDiagnostics(editorRef.current, compiledSchema);
      }
    });
  };

  return (
    <div className="editor-container absolute inset-0">
      <div
        ref={containerRef}
        className="monaco-editor-container absolute inset-0 bg-transparent"
        style={{ width: "100%", height: "100%" }}
      />
      <button
        type="button"
        id="editor-menu-button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="absolute top-2 right-2 z-20 p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors dark:bg-black/20 dark:hover:bg-black/40"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-600 dark:text-gray-300"
          aria-label="Open editor menu"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <title>Open editor menu</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>
      {editorRef.current && (
        <EditorMenu editor={editorRef.current} toast={toast} isOpen={isMenuOpen} onToggle={setIsMenuOpen} />
      )}
    </div>
  );
}
