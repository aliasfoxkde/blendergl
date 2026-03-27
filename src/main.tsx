import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// Register service worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed, app still works
    });
  });
}

// PWA install prompt handling
window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent the default mini-infobar
  e.preventDefault();
  // Store the event for later use
  (window as unknown as Record<string, unknown>).__pwaInstallPrompt = e;
  // Dispatch custom event so components can react
  window.dispatchEvent(new CustomEvent("pwa-install-available"));
});
