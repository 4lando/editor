/**
 * The key used to store the editor content in localStorage.
 * @type {string}
 */
const STORAGE_KEY = "lando_editor_content";

/**
 * Saves the editor content to localStorage.
 *
 * @param {string} content - The content to be saved.
 */
export function saveEditorContent(content) {
  try {
    localStorage.setItem(STORAGE_KEY, content);
  } catch (error) {
    console.warn("Failed to save editor content:", error);
  }
}

/**
 * Loads the editor content from localStorage.
 *
 * @returns {(string|null)} - The loaded content or null if failed.
 */
export function loadEditorContent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Failed to load editor content:", error);
    return null;
  }
}
