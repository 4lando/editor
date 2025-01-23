const STORAGE_KEY = 'lando_editor_content';

export function saveEditorContent(content) {
  try {
    localStorage.setItem(STORAGE_KEY, content);
  } catch (error) {
    console.warn('Failed to save editor content:', error);
  }
}

export function loadEditorContent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to load editor content:', error);
    return null;
  }
}
