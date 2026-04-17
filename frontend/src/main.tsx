import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { API_BASE_URL } from './lib/api'; // Initialize API config & Axios defaults

console.log("main.tsx: Starting...");
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Dynamically inject the PWA Manifest link using the correct API URL
// This ensures PWA works on Render regardless of domain setup
const manifestLink = document.createElement('link');
manifestLink.rel = 'manifest';
manifestLink.href = `${API_BASE_URL}/api/branding/manifest.json`;
document.head.appendChild(manifestLink);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}
