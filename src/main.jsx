import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initTheme } from "./lib/editor-theme.js";
import "./index.css";
import "./style.css";
import { InfoPanel } from "./components/ui/info-panel";
import { usageInstructions } from "./content/usage-instructions.jsx";

// Initialize theme before rendering
initTheme();

function initApp() {
  // Find the editor container in the existing HTML
  const editorContainer = document.querySelector(".editor-wrapper");
  const infoPanel = document.querySelector("#info-panel");

  if (editorContainer && infoPanel) {
    // Keep the loader, just remove other content if any
    const loader = editorContainer.querySelector("#editor-loader");
    // Create a new container for the React app that sits behind the loader
    const appContainer = document.createElement("div");
    appContainer.style.position = "absolute";
    appContainer.style.inset = "0";
    editorContainer.appendChild(appContainer);

    // Mount React app
    ReactDOM.createRoot(appContainer).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );

    // Keep the loader on top
    if (loader) {
      editorContainer.appendChild(loader);
    }

    // Mount InfoPanel component
    ReactDOM.createRoot(infoPanel).render(
      <React.StrictMode>
        <InfoPanel title="Usage Instructions" content={usageInstructions} />
      </React.StrictMode>,
    );
  }
}

// Initialize when the DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
