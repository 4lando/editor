import * as YAML from 'yaml';
import Ajv from 'ajv';
import { debug } from './debug';
import { MarkerSeverity } from './constants';
import * as monaco from 'monaco-editor';

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  allowUnionTypes: true,
});

let schemaDefinitions = null;
let compiledSchema = null;

// Try to import local schema, but don't fail if it doesn't exist
let localSchema = null;
try {
  if (import.meta.env.DEV) {
    debug.log('Development mode detected, attempting to use local schema...');
    try {
      const schema = await import('../landofile-spec.json');
      localSchema = JSON.stringify(schema.default);
      debug.log('Local schema loaded successfully');
    } catch (importError) {
      throw new Error(`Failed to import local schema: ${importError.message}`);
    }
  }
} catch (e) {
  debug.warn('Failed to load local schema:', e);
}

export async function loadSchema() {
  try {
    // If we already have a compiled schema, return it
    if (compiledSchema) {
      return compiledSchema;
    }

    const isDev = import.meta.env.DEV;
    let schema = null;

    if (isDev && localSchema) {
      try {
        schema = JSON.parse(localSchema);
        debug.log('Local schema parsed successfully');
      } catch (localError) {
        debug.warn('Failed to parse local schema:', localError);
      }
    }

    if (!schema) {
      const schemaUrl = 'https://4lando.github.io/lando-spec/landofile-spec.json';
      debug.log('Fetching schema from:', schemaUrl);

      const response = await fetch(schemaUrl);
      if (!response.ok) {
        debug.error('Schema fetch failed:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        });
        return null;
      }

      schema = await response.json();
      debug.log('Remote schema loaded:', schema);
    }

    if (!schema || typeof schema !== 'object') {
      debug.error('Invalid schema format:', schema);
      return null;
    }

    // Store schema definitions for hover support
    schemaDefinitions = flattenSchema(schema);
    debug.log('Schema definitions:', schemaDefinitions);

    // Remove $id to prevent Ajv from caching it
    const schemaToCompile = { ...schema };
    delete schemaToCompile.$id;

    // Verify schema can be compiled
    try {
      ajv.compile(schemaToCompile);
      compiledSchema = schema; // Store the original schema for completions
      return schema;
    } catch (compileError) {
      debug.error('Schema compilation failed:', compileError);
      return null;
    }
  } catch (error) {
    debug.error('Failed to load schema:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return null;
  }
}

// Flatten schema for easier lookup
function flattenSchema(schema, prefix = '', result = {}, visited = new Set(), rootSchema = null) {
  if (!schema || visited.has(schema)) {
    return result;
  }
  visited.add(schema);

  // Store root schema on first call
  if (!rootSchema) {
    rootSchema = schema;
    debug.log('Root schema initialized with keys:', Object.keys(rootSchema));
  }

  // Handle $ref resolution first
  if (schema.$ref) {
    debug.log('Resolving $ref:', schema.$ref);
    const refPath = schema.$ref.replace('#/', '').split('/');
    let refSchema = rootSchema;

    for (const part of refPath) {
      if (!refSchema[part]) {
        debug.warn('Failed to resolve ref part:', part);
        return result;
      }
      refSchema = refSchema[part];
    }

    // Merge properties from the referenced schema, but don't override existing ones
    const merged = {
      ...refSchema,
      ...schema,
      // Ensure description comes from the referenced schema unless explicitly set
      description: schema.description || refSchema.description,
    };
    Object.assign(schema, merged);
    debug.log('Resolved and merged reference:', refPath.join('/'), merged);
  }

  // Handle pattern properties
  if (schema.patternProperties) {
    debug.log('Processing pattern properties at prefix:', prefix);
    Object.entries(schema.patternProperties).forEach(([pattern, value]) => {
      const wildcardPath = prefix ? `${prefix}/*` : '*';
      debug.log('Processing pattern:', pattern, 'at path:', wildcardPath);

      // First resolve any references in the pattern property value
      if (value.$ref) {
        const refPath = value.$ref.replace('#/', '').split('/');
        let refSchema = rootSchema;

        for (const part of refPath) {
          if (!refSchema[part]) {
            debug.warn('Failed to resolve ref part:', part);
            return;
          }
          refSchema = refSchema[part];
        }

        // Create a new object for the pattern property to avoid sharing references
        result[wildcardPath] = {
          description: refSchema.description || '',
          type: refSchema.type || value.type || '',
          pattern,
          oneOf: refSchema.oneOf || value.oneOf || [],
          additionalProperties: refSchema.additionalProperties || value.additionalProperties,
        };
      } else {
        // Handle non-ref pattern properties
        result[wildcardPath] = {
          description: value.description || '',
          type: value.type || '',
          pattern,
          oneOf: value.oneOf || [],
          additionalProperties: value.additionalProperties,
        };
      }

      // Process the value schema (which might have its own properties or refs)
      flattenSchema(value, wildcardPath, result, visited, rootSchema);
    });
  }

  // Handle oneOf schemas
  if (schema.oneOf) {
    debug.log('Processing oneOf at prefix:', prefix);
    schema.oneOf.forEach((subSchema, index) => {
      const oneOfPath = `${prefix}#${index}`;
      flattenSchema(subSchema, oneOfPath, result, visited, rootSchema);
    });
  }

  // Handle regular properties
  if (schema.properties) {
    debug.log('Processing regular properties at prefix:', prefix);
    Object.entries(schema.properties).forEach(([key, value]) => {
      const path = prefix ? `${prefix}/${key}` : key;
      result[path] = {
        description: value.description || '',
        type: value.type || '',
        enum: value.enum || [],
        examples: value.examples || [],
        default: value.default,
        oneOf: value.oneOf || [],
        additionalProperties: value.additionalProperties,
      };

      // Continue flattening nested schemas
      flattenSchema(value, path, result, visited, rootSchema);
    });
  } else if (prefix && !schema.patternProperties) {
    // Handle non-object schemas
    debug.log('Adding non-object schema at prefix:', prefix);
    result[prefix] = {
      description: schema.description || '',
      type: schema.type || '',
      enum: schema.enum || [],
      examples: schema.examples || [],
      default: schema.default,
      oneOf: schema.oneOf || [],
      additionalProperties: schema.additionalProperties,
    };
  }

  // Process $defs
  if (schema.$defs) {
    debug.log('Processing $defs');
    Object.entries(schema.$defs).forEach(([key, value]) => {
      const defsPath = `$defs/${key}`;
      debug.log('Processing $def:', defsPath);
      flattenSchema(value, defsPath, result, visited, rootSchema);
    });
  }

  return result;
}

function formatExample(key, example) {
  try {
    // If example is an object or array, convert to YAML
    if (typeof example === 'object' && example !== null) {
      const obj = { [key]: example };
      return YAML.stringify(obj).trim();
    }

    // For primitive types, format as YAML key-value pair
    return `${key}: ${YAML.stringify(example)}`;
  } catch (error) {
    debug.error('Error formatting example:', error);
    return `${key}: ${JSON.stringify(example)}`;
  }
}

export function getHoverInfo(content, position) {
  try {
    // Find the key at the current position
    const lines = content.split('\n');
    const line = lines[position.lineNumber - 1];
    const match = line.match(/^(\s*)(\w+):/);

    if (match) {
      const [, indent, key] = match;
      const level = indent.length / 2;

      // Build path to current key
      const path = findPathAtPosition(content, position);

      debug.log('Looking up hover info for path:', path);

      // Try to find schema info using different path patterns
      let info = null;
      const possiblePaths = generatePossiblePaths(path);

      for (const schemaPath of possiblePaths) {
        debug.log('Trying schema path:', schemaPath);
        if (schemaDefinitions && schemaDefinitions[schemaPath]) {
          info = schemaDefinitions[schemaPath];
          debug.log('Found schema info at path:', schemaPath);
          break;
        }
      }

      if (info) {
        let contents = [];

        // Description
        if (info.description) {
          contents.push({ value: info.description });
        }

        // Type information
        if (info.type) {
          contents.push({ value: `Type: ${info.type}` });
        }

        // Pattern (for pattern properties)
        if (info.pattern) {
          contents.push({ value: `Pattern: ${info.pattern}` });
        }

        // Enum values
        if (info.enum && info.enum.length) {
          contents.push({ value: `Allowed values: ${info.enum.join(', ')}` });
        }

        // Default value
        if (info.default !== undefined) {
          contents.push({ value: 'Default:' });
          contents.push({
            value: '```yaml\n' + formatExample(key, info.default) + '\n```'
          });
        }

        // Examples
        if (info.examples && info.examples.length) {
          contents.push({ value: '\nExamples:' });
          info.examples.forEach(example => {
            contents.push({
              value: '```yaml\n' + formatExample(key, example) + '\n```'
            });
          });
        }

        // OneOf options
        if (info.oneOf && info.oneOf.length) {
          contents.push({ value: '\nPossible Formats:' });
          info.oneOf.forEach((option, index) => {
            if (option.description) {
              contents.push({ value: `${index + 1}. ${option.description}` });
            }
          });
        }

        return {
          contents,
          range: {
            startLineNumber: position.lineNumber,
            startColumn: indent.length + 1,
            endLineNumber: position.lineNumber,
            endColumn: indent.length + key.length + 1
          }
        };
      }
    }
  } catch (error) {
    debug.error('Error getting hover info:', error);
  }
  return null;
}

// Helper function to generate possible schema paths including wildcards
function generatePossiblePaths(path) {
  const paths = [];

  // Start with the most specific full path
  if (path.length > 0) {
    paths.push(path.join('/'));
  }

  // Then try wildcard variations, still maintaining specificity
  if (path.length > 1) {
    // For a path like ['services', 'node', 'type'], try:
    // 1. services/*/type
    // 2. services/node/*
    // 3. services/*
    for (let i = path.length - 1; i > 0; i--) {
      const wildcardPath = [
        ...path.slice(0, i),
        '*',
        ...path.slice(i + 1),
      ].join('/');
      paths.push(wildcardPath);
    }
  }

  // Add root level wildcard last (lowest priority)
  paths.push('*');

  debug.log('Generated possible paths:', paths);
  return paths.filter(Boolean); // Remove any empty paths
}

export function validateYaml(content, schema) {
  try {
    // Skip validation for empty content
    if (!content.trim()) {
      return [];
    }

    debug.log('Parsing YAML content:', content);
    let parsed = YAML.parse(content);

    // Convert undefined/null values after colons to empty objects
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const match = line.match(/^(\s*)(\w+):(\s*)$/);
      if (match) {
        // If we have a key with nothing after the colon
        const [, indent, key] = match;
        const path = findPathAtPosition(content, { lineNumber: index + 1 });

        // Build the path to this property
        let current = parsed = parsed || {};
        path.forEach((segment, i) => {
          if (i === path.length - 1) {
            // Last segment is our current key
            current[segment] = current[segment] ?? {};
          } else {
            current[segment] = current[segment] ?? {};
            current = current[segment];
          }
        });

        // Set empty object for the current key if it's undefined
        if (path.length === 0) {
          parsed[key] = parsed[key] ?? {};
        } else {
          current[key] = current[key] ?? {};
        }
      }
    });

    debug.log('Parsed YAML with empty objects:', parsed);

    // Validate against schema
    const validate = ajv.compile(schema);
    const valid = validate(parsed);

    if (!valid) {
      debug.log('Schema validation errors:', validate.errors);

      // Group errors by location to prevent duplicates
      const errorsByLocation = new Map();

      validate.errors.forEach(error => {
        const path = error.instancePath.split('/').filter(Boolean);
        const location = findLocationInYaml(content, path);
        const locationKey = `${location.line}:${location.column}`;

        // Only keep the first error for each location
        if (!errorsByLocation.has(locationKey)) {
          if (error.keyword === 'additionalProperties') {
            // Find the location of the unexpected property
            const path = error.instancePath.split('/').filter(Boolean);
            const unexpectedProp = error.params.additionalProperty;
            path.push(unexpectedProp); // Add the unexpected property to the path
            const location = findLocationInYaml(content, path);

            errorsByLocation.set(locationKey, {
              startLineNumber: location.line,
              endLineNumber: location.line,
              startColumn: location.column,
              endColumn: location.column + unexpectedProp.length,
              message: `Unexpected property "${unexpectedProp}"`,
              severity: MarkerSeverity.Error,
              source: 'JSON Schema'
            });
          } else {
            errorsByLocation.set(locationKey, {
              startLineNumber: location.line,
              endLineNumber: location.line,
              startColumn: location.column,
              endColumn: location.column + (location.length || 1),
              message: error.instancePath ? `${error.instancePath.split('/').pop()} ${error.message} at ${error.instancePath}` : error.message,
              severity: MarkerSeverity.Error,
              source: 'JSON Schema'
            });
          }
        }
      });

      return Array.from(errorsByLocation.values());
    }

    return [];
  } catch (error) {
    debug.warn('YAML parsing error:', error);

    if (error instanceof YAML.YAMLParseError) {
      const { message, pos, linePos } = error;
      debug.log('Parse error details:', { message, pos, linePos });

      return [{
        startLineNumber: linePos ? linePos[0].line : 1,
        endLineNumber: linePos ? linePos[1].line : 1,
        startColumn: linePos ? linePos[0].col : 1,
        endColumn: linePos ? linePos[1].col : content.length,
        message: message,
        severity: MarkerSeverity.Error,
        source: 'YAML Parser'
      }];
    }

    return [{
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 1,
      endColumn: content.length,
      message: error.message,
      severity: MarkerSeverity.Error,
      source: 'YAML Parser'
    }];
  }
}

function findLocationInYaml(content, path) {
  const lines = content.split('\n');
  let currentLine = 0;
  let currentPath = [];
  let arrayIndex = 0;
  let currentArrayPath = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle array items
    const arrayMatch = line.match(/^(\s*)-/);
    if (arrayMatch) {
      const [, indent] = arrayMatch;
      const level = indent.length / 2;

      // Reset array index when starting a new array at a different path
      if (currentArrayPath !== level) {
        arrayIndex = 0;
        currentArrayPath = level;
      } else {
        arrayIndex++;
      }

      // Check if this array index matches our path
      const targetIndex = parseInt(path[level]);
      if (!isNaN(targetIndex) && targetIndex === arrayIndex) {
        return {
          line: i + 1,
          column: indent.length + 1,
          length: line.length - indent.length
        };
      }
    } else {
      // Reset array tracking when we're not in an array
      currentArrayPath = null;
      arrayIndex = 0;

    // Handle regular object properties
      const match = line.match(/^(\s*)(\w+):/);
      if (match) {
        const [, indent, key] = match;
        const level = indent.length / 2;

        currentPath = currentPath.slice(0, level);
        currentPath[level] = key;

        if (pathsMatch(currentPath, path)) {
          return {
            line: i + 1,
            column: indent.length + 1,
            length: key.length
          };
        }
      }
    }
  }

  return { line: 1, column: 1, length: 1 };
}

function pathsMatch(currentPath, targetPath) {
  return targetPath.every((segment, i) => currentPath[i] === segment);
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
    // No space after colon for objects
    return `${key}:\n  \${1}`;
  }

  // Space after colon for non-objects
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

// Export the new function
export { getCompletionItems, schemaDefinitions };
