
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CentralizedErrorHandler } from './lib/centralized-error-handler';

// Initialize enterprise error handling
CentralizedErrorHandler.setupGlobalErrorHandling();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container not found");
}

const root = createRoot(container);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
