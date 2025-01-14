import * as monaco from 'monaco-editor';
import { debug } from './debug';

export function registerCompletionProvider(schema) {
  return monaco.languages.registerCompletionItemProvider('yaml', {
    async provideCompletionItems(model, position) {
      try {
        if (!schema) {
          debug.warn('No schema available for completions');
          return { suggestions: [] };
        }

        return getCompletionItems(model, position, schema);
      } catch (error) {
        debug.error('Error in completion provider:', error);
        return { suggestions: [] };
      }
    },
  });
}

function getCompletionItems(model, position, schema) {
  try {
    // Get the current path in the YAML document
    const path = findPathAtPosition(model.getValue(), position);
    debug.log('Getting completions for path:', path);

    // Get current line and word
    const lineContent = model.getLineContent(position.lineNumber);
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn,
    };

    // At root level
    if (!lineContent.startsWith(' ')) {
      return getRootCompletions(schema, range);
    }

    // Get the schema section for the current path
    const currentSchema = getSchemaAtPath(schema, path);
    if (!currentSchema) {
      debug.log('No schema found for path:', path);
      return { suggestions: [] };
    }

    return getCompletionsForSchema(currentSchema, range);
  } catch (error) {
    debug.error('Error getting completion items:', error);
    return { suggestions: [] };
  }
}

function getRootCompletions(schema, range) {
  if (!schema.properties) return { suggestions: [] };

  const suggestions = Object.entries(schema.properties).map(([key, prop]) => ({
    label: key,
    kind: monaco.languages.CompletionItemKind.Field,
    documentation: {
      value: formatPropertyDocs(prop),
      isTrusted: true,
    },
    insertText: createInsertText(key, prop),
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range: range,
    sortText: key,
    preselect: true,
  }));

  return { suggestions };
}

function getCompletionsForSchema(schema, range) {
  const suggestions = [];

  // Collect all possible schemas (including from oneOf)
  const schemas = [schema];
  if (schema.oneOf) {
    schemas.push(...schema.oneOf);
  }

  // Process each schema
  schemas.forEach(currentSchema => {
    // Handle enum values
    if (currentSchema.enum) {
      suggestions.push(...currentSchema.enum.map(value => ({
        label: String(value),
        kind: monaco.languages.CompletionItemKind.Value,
        documentation: 'Allowed value',
        insertText: String(value),
        range: range,
        sortText: '1' + String(value),
        preselect: true,
      })));
    }

    // Handle examples as value suggestions
    if (currentSchema.examples) {
      suggestions.push(...currentSchema.examples.map(example => ({
        label: String(example),
        kind: monaco.languages.CompletionItemKind.Value,
        documentation: 'Example value',
        insertText: String(example),
        range: range,
        sortText: '2' + String(example),
        preselect: true,
      })));
    }

    // Handle properties for objects
    if (currentSchema.properties) {
      suggestions.push(...Object.entries(currentSchema.properties).map(([key, prop]) => ({
        label: key,
        kind: monaco.languages.CompletionItemKind.Field,
        documentation: {
          value: formatPropertyDocs(prop),
          isTrusted: true,
        },
        insertText: createInsertText(key, prop),
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: range,
        sortText: '3' + key,
        preselect: true,
      })));
    }

    // Handle pattern properties
    if (currentSchema.patternProperties) {
      Object.entries(currentSchema.patternProperties).forEach(([pattern, prop]) => {
        if (prop.examples) {
          suggestions.push(...prop.examples.map(example => ({
            label: String(example),
            kind: monaco.languages.CompletionItemKind.Field,
            documentation: {
              value: formatPropertyDocs(prop),
              isTrusted: true,
            },
            insertText: createInsertText(String(example), prop),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
            sortText: '4' + String(example),
            preselect: true,
          })));
        }
      });
    }

    // Add default value suggestion
    if (currentSchema.default !== undefined) {
      suggestions.push({
        label: String(currentSchema.default),
        kind: monaco.languages.CompletionItemKind.Value,
        documentation: 'Default value',
        insertText: String(currentSchema.default),
        range: range,
        sortText: '0' + String(currentSchema.default),
        preselect: true,
      });
    }
  });

  // Remove duplicates
  const seen = new Set();
  return {
    suggestions: suggestions.filter(suggestion => {
      const key = suggestion.label + suggestion.kind;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}

function formatPropertyDocs(prop) {
  const parts = [];
  
  if (prop.description) {
    parts.push(prop.description);
  }

  if (prop.type) {
    parts.push(`**Type:** ${prop.type}`);
  }

  if (prop.enum?.length) {
    parts.push(`**Allowed values:**\n- ${prop.enum.join('\n- ')}`);
  }

  if (prop.default !== undefined) {
    parts.push(`**Default:** ${JSON.stringify(prop.default)}`);
  }

  if (prop.examples?.length) {
    parts.push(`**Examples:**\n\`\`\`yaml\n${prop.examples.map(ex => JSON.stringify(ex)).join('\n')}\n\`\`\``);
  }

  return parts.join('\n\n');
}

function createInsertText(key, prop) {
  if (prop.type === 'object') {
    // No snippets for objects, just add newline and indentation
    return `${key}:\n  `;
  }

  // Keep snippets for non-objects
  let insertText = `${key}: `;
  if (prop.examples?.length) {
    insertText += `\${1:${prop.examples[0]}}`;
  } else if (prop.enum?.length) {
    insertText += `\${1:${prop.enum[0]}}`;
  } else if (prop.default !== undefined) {
    insertText += `\${1:${prop.default}}`;
  } else {
    insertText += '${1}';
  }

  return insertText + '\n';
}

function getSchemaAtPath(schema, path) {
  let current = schema;
  
  for (const segment of path) {
    if (!current) return null;
    
    // Check properties first
    if (current.properties?.[segment]) {
      current = current.properties[segment];
      continue;
    }
    
    // Check pattern properties
    if (current.patternProperties) {
      const patternMatch = Object.entries(current.patternProperties)
        .find(([pattern]) => new RegExp(pattern).test(segment));
      if (patternMatch) {
        current = patternMatch[1];
        continue;
      }
    }
    
    // Check if we have a $ref
    if (current.$ref) {
      const refSchema = resolveRef(current.$ref, schema);
      if (refSchema) {
        current = refSchema;
        continue;
      }
    }
    
    return null;
  }
  
  return current;
}

function resolveRef($ref, rootSchema) {
  const path = $ref.replace('#/', '').split('/');
  let current = rootSchema;
  
  for (const segment of path) {
    if (!current[segment]) return null;
    current = current[segment];
  }
  
  return current;
}

function findPathAtPosition(content, position) {
  const lines = content.split('\n');
  let currentPath = [];
  
  for (let i = 0; i < position.lineNumber; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*)(\w+):/);
    
    if (match) {
      const [, indent, key] = match;
      const level = indent.length / 2;
      
      // Update current path based on indentation
      currentPath = currentPath.slice(0, level);
      currentPath[level] = key;
    }
  }
  
  return currentPath.filter(Boolean);
} 