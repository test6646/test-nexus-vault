
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ProductionCleanup } from './lib/production-cleanup';
import { PerformanceMonitor } from './lib/performance-monitor';

// Initialize production optimizations
ProductionCleanup.initializeProduction();

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  PerformanceMonitor.getInstance().initialize();
}

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
