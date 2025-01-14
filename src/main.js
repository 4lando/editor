import { Editor } from './components/Editor';
import { initTheme } from './theme';

// Initialize theme before editor
initTheme();

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEditorComponent);
} else {
  initEditorComponent();
}

async function initEditorComponent() {
  const container = document.getElementById('editor');
  const editor = new Editor(container);
  await editor.init();
} 