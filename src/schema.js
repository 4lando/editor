import * as YAML from 'yaml';
import Ajv from 'ajv';
import { debug } from './debug';
import { MarkerSeverity } from './constants';

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
});

let schemaDefinitions = null;

export async function loadSchema() {
  try {
    debug.log('Fetching schema from:', 'https://4lando.github.io/lando-spec/landofile-spec.json');
    const response = await fetch('https://4lando.github.io/lando-spec/landofile-spec.json');
    const schema = await response.json();
    debug.log('Schema loaded:', schema);
    
    // Store schema definitions for hover support
    schemaDefinitions = flattenSchema(schema);
    debug.log('Schema definitions:', schemaDefinitions);
    
    // Compile schema
    ajv.compile(schema);
    return schema;
  } catch (error) {
    debug.error('Failed to load schema:', error);
    return null;
  }
}

// Flatten schema for easier lookup
function flattenSchema(schema, prefix = '', result = {}) {
  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, value]) => {
      const path = prefix ? `${prefix}/${key}` : key;
      result[path] = {
        description: value.description || '',
        type: value.type || '',
        enum: value.enum || [],
        examples: value.examples || [],
        default: value.default,
      };
      if (value.properties) {
        flattenSchema(value, path, result);
      }
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
      const schemaPath = path.join('/');
      
      debug.log('Looking up hover info for path:', schemaPath);
      
      if (schemaDefinitions && schemaDefinitions[schemaPath]) {
        const info = schemaDefinitions[schemaPath];
        let contents = [];
        
        // Description
        if (info.description) {
          contents.push({ value: info.description });
        }
        
        // Type information
        if (info.type) {
          contents.push({ value: `Type: ${info.type}` });
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

export function validateYaml(content, schema) {
  try {
    debug.log('Parsing YAML content:', content);
    const parsed = YAML.parse(content);
    debug.log('Parsed YAML:', parsed);

    // Validate against schema
    const validate = ajv.compile(schema);
    const valid = validate(parsed);

    if (!valid) {
      debug.log('Schema validation errors:', validate.errors);
      return validate.errors.map(error => {
        // Handle different error types
        if (error.keyword === 'additionalProperties') {
          // Find the location of the unexpected property
          const path = error.instancePath.split('/').filter(Boolean);
          const unexpectedProp = error.params.additionalProperty;
          path.push(unexpectedProp); // Add the unexpected property to the path
          const location = findLocationInYaml(content, path);
          
          return {
            startLineNumber: location.line,
            endLineNumber: location.line,
            startColumn: location.column,
            endColumn: location.column + unexpectedProp.length,
            message: `Unexpected property "${unexpectedProp}"`,
            severity: MarkerSeverity.Error,
            source: 'JSON Schema'
          };
        }

        // Handle other validation errors
        const path = error.instancePath.split('/').filter(Boolean);
        const location = findLocationInYaml(content, path);
        
        return {
          startLineNumber: location.line,
          endLineNumber: location.line,
          startColumn: location.column,
          endColumn: location.column + (location.length || 1),
          message: `${error.message} at ${error.instancePath || 'root'}`,
          severity: MarkerSeverity.Error,
          source: 'JSON Schema'
        };
      });
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*)(\w+):/);
    
    if (match) {
      const [, indent, key] = match;
      const level = indent.length / 2;
      
      // Update current path based on indentation
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