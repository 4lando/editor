import React from "react";
import { Editor } from "./components/ui/editor";
import { InfoPanel } from "./components/ui/info-panel";
import { ShareDialog } from "./components/ui/share-dialog";
import { Toaster } from "./components/ui/toaster";
import { usageInstructions } from "./content/usage-instructions";
import { useDialogStore } from "./lib/dialog";

export default function App() {
  const { isShareDialogOpen, shareUrl, closeShareDialog } = useDialogStore();

  return (
    <>
      <Editor />
      <ShareDialog isOpen={isShareDialogOpen} onClose={closeShareDialog} shareUrl={shareUrl} />
      <Toaster />
    </>
  );
}
