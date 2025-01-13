import { debug } from './debug';

// Queue to manage multiple toasts
const toastQueue = [];
let isShowingToast = false;

export function showToast(message, duration = 3000) {
  debug.log('Showing toast:', message);
  
  // Add to queue and process
  toastQueue.push({ message, duration });
  
  // If we're showing a toast and this is the first item in the queue,
  // show it as a peek immediately
  if (isShowingToast && toastQueue.length === 1) {
    const nextToast = document.createElement('div');
    nextToast.className = 'toast-notification next text-gray-700 dark:text-gray-200 border';
    nextToast.textContent = message;
    document.body.appendChild(nextToast);
    
    requestAnimationFrame(() => {
      nextToast.classList.add('show');
    });
  }
  
  processToastQueue();
}

function processToastQueue() {
  if (isShowingToast || toastQueue.length === 0) {
    return;
  }

  isShowingToast = true;
  const { message, duration } = toastQueue.shift();

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast-notification text-gray-700 dark:text-gray-200 border';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Show peek of next toast if queue is not empty
  if (toastQueue.length > 0) {
    const nextToast = document.createElement('div');
    nextToast.className = 'toast-notification next text-gray-700 dark:text-gray-200 border';
    nextToast.textContent = toastQueue[0].message;
    document.body.appendChild(nextToast);
    
    requestAnimationFrame(() => {
      nextToast.classList.add('show');
    });
  }
  
  let hideTimeout;
  let removeTimeout;
  
  const startHideTimer = () => {
    hideTimeout = setTimeout(() => {
      toast.classList.remove('show');
      // Also remove the peek of next toast if it exists
      const nextToast = document.querySelector('.toast-notification.next');
      if (nextToast) {
        nextToast.classList.remove('show');
      }
      removeTimeout = setTimeout(() => {
        document.body.removeChild(toast);
        // Remove the next toast peek if it exists
        nextToast?.remove();
        isShowingToast = false;
        processToastQueue(); // Process next toast if any
      }, 300); // Remove after fade out
    }, duration);
  };
  
  // Handle click to dismiss
  toast.addEventListener('click', () => {
    debug.log('Toast clicked - dismissing');
    clearTimeout(hideTimeout);
    clearTimeout(removeTimeout);
    startHideTimer();
  });
  
  // Handle hover interactions
  toast.addEventListener('mouseenter', () => {
    debug.log('Toast hovered - pausing timer');
    clearTimeout(hideTimeout);
    clearTimeout(removeTimeout);
    toast.classList.add('show');
  });
  
  toast.addEventListener('mouseleave', () => {
    debug.log('Toast unhovered - restarting timer');
    startHideTimer();
  });
  
  // Trigger initial animation and timer
  requestAnimationFrame(() => {
    toast.classList.add('show');
    startHideTimer();
  });
}