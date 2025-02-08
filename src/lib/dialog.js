import { create } from "zustand";

/**
 * Creates a Zustand store for managing the state of the share dialog.
 *
 * @returns {Object} - The Zustand store with methods to manage the share dialog state.
 */
const useDialogStore = create((set) => ({
  /**
   * Indicates if the share dialog is currently open.
   *
   * @type {boolean}
   */
  isShareDialogOpen: false,
  /**
   * The URL to be shared.
   *
   * @type {string}
   */
  shareUrl: "",
  /**
   * Opens the share dialog with the specified URL.
   *
   * @param {string} url - The URL to be shared.
   */
  openShareDialog: (url) => set({ isShareDialogOpen: true, shareUrl: url }),
  /**
   * Closes the share dialog.
   */
  closeShareDialog: () => set({ isShareDialogOpen: false }),
}));

/**
 * Shows the share dialog with the specified URL.
 *
 * @param {string} shareUrl - The URL to be shared.
 */
export const showShareDialog = (shareUrl) => {
  useDialogStore.getState().openShareDialog(shareUrl);
};

export { useDialogStore };
