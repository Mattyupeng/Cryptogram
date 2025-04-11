import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSodium } from "./lib/encryption";

// Initialize libsodium when the app starts
(async () => {
  try {
    await initSodium();
    console.log("Encryption library initialized successfully");
  } catch (error) {
    console.error("Failed to initialize encryption library:", error);
  }
})();

createRoot(document.getElementById("root")!).render(<App />);
