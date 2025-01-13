import { debug } from './debug';
import { formatYaml } from './format';
import { parseDocument } from 'yaml';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

// Common YAML strings to replace with shorter versions
const compressionMap = {
  'recipe: ': '~rp:',
  'config: ': '~cp:',
  'services: ': '~ss:',
  'webroot: ': '~wr:',
  'database: ': '~db:',
  'type: ': '~t:',
  'build: ': '~b:',
  'command: ': '~cm:',
  'port: ': '~pt:',
  'name: ': '~n:',
  'tooling:': '~tl:',
  'service:': '~s:',
  'description:': '~dsc:',
  'environment:': '~e:',
  'image:': '~i:',
  'volumes:': '~v:',
  ': false': ': f',
  ': true': ': t',
};

export function generateShareUrl(content) {
  try {
    // Format content before sharing
    let formatted = formatYaml(content);
    
    // Parse as YAML to preserve comments
    const doc = parseDocument(formatted, {
      keepBlobsInJSON: true,
      keepCstNodes: true,
      keepNodeTypes: true,
    });

    // Convert to string with minimal formatting
    const yamlStr = doc.toString({
      indent: 1,
      lineWidth: 0,
      minContentWidth: 0,
      doubleQuotedAsJSON: false,
    });
    
    // Apply compression map
    let compressed = yamlStr;
    Object.entries(compressionMap).forEach(([key, value]) => {
      compressed = compressed.replaceAll(key, value);
    });
    
    // Compress the shortened content
    const encoded = compressToEncodedURIComponent(compressed);
    const url = new URL(window.location.href);
    url.searchParams.set('s', encoded);
    return url.toString();
  } catch (error) {
    debug.error('Failed to generate share URL:', error);
    throw error;
  }
}

export function getSharedContent() {
  try {
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get('s');
    if (!encoded) return null;
    
    let content = decompressFromEncodedURIComponent(encoded);
    if (!content) return null;

    // Reverse compression map
    Object.entries(compressionMap).forEach(([key, value]) => {
      content = content.replaceAll(value, key);
    });
    
    // Parse and re-stringify to ensure proper formatting
    const doc = parseDocument(content, {
      keepBlobsInJSON: true,
      keepCstNodes: true,
      keepNodeTypes: true,
    });
    
    return doc.toString({
      indent: 2,
      lineWidth: 0,
      minContentWidth: 0,
      doubleQuotedAsJSON: false,
    });
  } catch (error) {
    debug.error('Failed to get shared content:', error);
    return null;
  }
} 