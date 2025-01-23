import { create } from 'zustand'

const useDialogStore = create((set) => ({
  isShareDialogOpen: false,
  shareUrl: '',
  openShareDialog: (url) => set({ isShareDialogOpen: true, shareUrl: url }),
  closeShareDialog: () => set({ isShareDialogOpen: false }),
}))

export const showShareDialog = (shareUrl) => {
  useDialogStore.getState().openShareDialog(shareUrl)
}

export { useDialogStore }
