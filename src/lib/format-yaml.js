import * as monaco from 'monaco-editor';
import { parseDocument } from 'yaml';
import { debug } from "./debug";

export function formatYaml(content) {
  try {
    // First normalize line endings
    const normalizedContent = content
      .replace(/\r\n/g, "\n")
      // Replace lines with only whitespace with empty lines
      .replace(/^\s+$/gm, '');

    // Parse document while preserving structure
    const doc = parseDocument(normalizedContent, {
      keepBlobsInJSON: true,
      keepCstNodes: true,
      keepNodeTypes: true,
      strict: false,
      prettyErrors: true,
    });

    // Format the document while preserving comments and structure
    doc.commentBefore = doc.commentBefore?.trimEnd() || null;
    if (doc.contents) {
      formatNode(doc.contents);
    }

    // Stringify with consistent formatting
    const formatted = doc.toString({
      indent: 2,
      lineWidth: 0,
      minContentWidth: 0,
      doubleQuotedAsJSON: false,
    });

    // Clean up multiple empty lines while preserving single ones
    return formatted
      .replace(/\n{3,}/g, "\n\n") +
      (formatted.endsWith("\n") ? "" : "\n");
  } catch (error) {
    debug.error("Failed to format YAML:", error);
    throw error;
  }
}

// Helper function to format nodes while preserving comments
function formatNode(node) {
  if (!node) return;

  // Helper to determine correct comment indentation
  const getCommentIndent = (comment, isBeforeNode) => {
    if (!comment) return comment;
    const lines = comment.split('\n');
    return lines.map((line, i) => {
      // If this is a comment before a node, use the node's indentation
      // If it's after a node, keep its current indentation
      if (isBeforeNode && line.startsWith("#")) {
        // Find the first non-empty line after this comment
        const nextContent = node.value || node;
        const indent = nextContent?.type === "MAP" ? "  " : "";
        return indent + line.trim();
      }
      return line;
    }).join('\n');
  };

  // Preserve comments with correct indentation
  if (node.comment) node.comment = getCommentIndent(node.comment.trimEnd(), false);
  if (node.commentBefore) node.commentBefore = getCommentIndent(node.commentBefore.trimEnd(), true);

  // Format collection items
  if (node.items) {
    for (const item of node.items) {
      if (item.comment) item.comment = getCommentIndent(item.comment.trimEnd(), false);
      if (item.commentBefore) item.commentBefore = getCommentIndent(item.commentBefore.trimEnd(), true);
      if (item.value) formatNode(item.value);
    }
  }

  // Format key/value pairs
  if (node.pairs) {
    for (const pair of node.pairs) {
      if (pair.comment) pair.comment = getCommentIndent(pair.comment.trimEnd(), false);
      if (pair.commentBefore) pair.commentBefore = getCommentIndent(pair.commentBefore.trimEnd(), true);
      if (pair.key) formatNode(pair.key);
      if (pair.value) formatNode(pair.value);
    }
  }
}

export function setupYamlFormatting(editor, toast) {
  // Add format action to context menu
  editor.addAction({
    id: 'format-yaml',
    label: 'Format Document',
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
    ],
    contextMenuGroupId: '1_modification',
    contextMenuOrder: 1.5,
    run: () => formatDocument(editor, toast),
  });
}

export function formatDocument(editor, toast) {
  try {
    const content = editor.getValue();
    const formatted = formatYaml(content);
    editor.executeEdits('format', [{
      range: editor.getModel().getFullModelRange(),
      text: formatted,
    }]);
    debug.log('YAML formatted successfully');

    toast({
      description: 'Document formatted successfully',
      duration: 2000,
    });
  } catch (error) {
    debug.error('Format failed:', error);
    const errorMatch = error.message.match(/at line (\d+), column (\d+)/i);
    const startLine = errorMatch ? Number.parseInt(errorMatch[1]) : 1;
    const startCol = errorMatch ? Number.parseInt(errorMatch[2]) : 1;

    toast({
      description: `Failed to format: ${error.message}`,
      duration: 5000,
      className: 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-200',
    });

    monaco.editor.setModelMarkers(editor.getModel(), 'yaml', [{
      severity: MarkerSeverity.Error,
      message: `Failed to format: ${error.message}`,
      startLineNumber: startLine,
      startColumn: startCol,
      endLineNumber: startLine,
      endColumn: startCol + 1,
    }]);
  }
}
