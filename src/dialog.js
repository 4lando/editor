import { debug } from './debug';
import { showToast } from './toast';

export function showShareDialog(shareUrl) {
  const dialog = document.createElement('div');
  dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  dialog.innerHTML = `
    <div class="bg-[--c-bg-lighter] p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 relative">
      <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Share Landofile</h2>
      <div class="flex gap-2">
        <input 
          type="text" 
          value="${shareUrl}" 
          readonly
          class="flex-1 px-3 py-2 border rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        >
        <button class="copy-btn bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition-colors">
          Copy
        </button>
      </div>
      <button class="close-btn absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  `;

  // Add event listeners
  const closeBtn = dialog.querySelector('.close-btn');
  const copyBtn = dialog.querySelector('.copy-btn');
  const input = dialog.querySelector('input');

  closeBtn.addEventListener('click', () => {
    dialog.remove();
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Share URL copied to clipboard', 2000);
    } catch (error) {
      debug.error('Failed to copy URL:', error);
      showToast('Failed to copy URL to clipboard', 5000);
    }
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.remove();
    }
  });

  document.body.appendChild(dialog);
} 