import { debug } from "@/lib/debug";
import { showShareDialog } from "@/lib/dialog";
import { formatDocument, formatYaml } from "@/lib/format-yaml";
import { generateShareUrl } from "@/lib/share";
import * as monaco from "monaco-editor";
import { MarkerSeverity } from "monaco-editor/esm/vs/platform/markers/common/markers";
import React from "react";

export function EditorMenu({ editor, toast, isOpen, onToggle }) {
  const handleFormat = () => {
    formatDocument(editor, toast);
    onToggle(false);
  };

  const handleShare = () => {
    try {
      const content = editor.getValue();
      const shareUrl = generateShareUrl(content);
      showShareDialog(shareUrl);
      onToggle(false);
    } catch (error) {
      debug.error("Failed to share:", error);
      toast({
        description: "Failed to generate share URL",
        duration: 5000,
        className: "bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200",
      });
    }
  };

  const handleSave = () => {
    const content = editor.getValue();
    const blob = new Blob([content], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "_.lando.yml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onToggle(false);

    toast({
      description: 'Remember to remove the underscore from "_.lando.yml" after downloading',
      duration: 5000,
    });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/^\.lando(\..*)?\.yml$/i)) {
      debug.warn("Invalid file type:", file.name);
      toast({
        description: "Only .lando.yml and .lando.*.yml files are supported",
        duration: 5000,
        className: "bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200",
      });
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
      editor.executeEdits("format", [
        {
          range: editor.getModel().getFullModelRange(),
          text: formatted,
        },
      ]);
      debug.log("File loaded successfully:", file.name);
      onToggle(false);
    } catch (error) {
      debug.error("Error reading file:", error);
      monaco.editor.setModelMarkers(editor.getModel(), "yaml", [
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
  };

  return (
    <div
      className={`editor-drawer bg-[--c-bg-lighter] border-l border-gray-200 dark:border-gray-600 ${isOpen ? "open" : ""}`}
    >
      <div className="editor-drawer-content p-2">
        <div className="space-y-2">
          <label className="w-full flex items-center gap-2.5 py-2 px-3 text-gray-700 dark:text-gray-200 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5"
              role="img"
              aria-labelledby="title"
            >
              <title id="title">Open file</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
              />
            </svg>
            Open
            <input type="file" accept=".yml,.yaml" className="hidden" onChange={handleFileSelect} />
          </label>
          <button
            type="button"
            onClick={handleSave}
            className="w-full flex items-center gap-2.5 py-2 px-3 text-gray-700 dark:text-gray-200 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5"
              role="img"
              aria-labelledby="title"
            >
              <title id="title">Save file</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            Save
          </button>
          <button
            type="button"
            onClick={handleFormat}
            className="w-full flex items-center gap-2.5 py-2 px-3 text-gray-700 dark:text-gray-200 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5"
              role="img"
              aria-labelledby="title"
            >
              <title id="title">Format document</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Format
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="w-full flex items-center gap-2.5 py-2 px-3 text-gray-700 dark:text-gray-200 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="w-5 h-5"
              role="img"
              aria-labelledby="title"
            >
              <title id="title">Share document</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
