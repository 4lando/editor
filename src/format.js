import { parse, stringify, parseDocument } from 'yaml';
import { debug } from './debug';

export function formatYaml(content) {
  try {
    // First normalize line endings
    const normalizedContent = content
      .replace(/\r\n/g, '\n')
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
      .replace(/\n{3,}/g, '\n\n')
      + (formatted.endsWith('\n') ? '' : '\n');
  } catch (error) {
    debug.error('Failed to format YAML:', error);
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
      if (isBeforeNode && line.startsWith('#')) {
        // Find the first non-empty line after this comment
        const nextContent = node.value || node;
        const indent = nextContent?.type === 'MAP' ? '  ' : '';
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
    node.items.forEach(item => {
      if (item.comment) item.comment = getCommentIndent(item.comment.trimEnd(), false);
      if (item.commentBefore) item.commentBefore = getCommentIndent(item.commentBefore.trimEnd(), true);
      if (item.value) formatNode(item.value);
    });
  }

  // Format key/value pairs
  if (node.pairs) {
    node.pairs.forEach(pair => {
      if (pair.comment) pair.comment = getCommentIndent(pair.comment.trimEnd(), false);
      if (pair.commentBefore) pair.commentBefore = getCommentIndent(pair.commentBefore.trimEnd(), true);
      if (pair.key) formatNode(pair.key);
      if (pair.value) formatNode(pair.value);
    });
  }
}