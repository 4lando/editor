import React from "react";
import { Editor } from "./components/ui/editor";
import { ShareDialog } from "./components/ui/share-dialog";
import { useDialogStore } from "./lib/dialog";
import { Toaster } from "./components/ui/toaster";

export default function App() {
  const { isShareDialogOpen, shareUrl, closeShareDialog } = useDialogStore();

  return (
    <>
      <Editor />
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={closeShareDialog}
        shareUrl={shareUrl}
      />
      <Toaster />
    </>
  );
}
