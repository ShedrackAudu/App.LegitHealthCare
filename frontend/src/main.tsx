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

// Dynamically inject/update the PWA Manifest link using the correct API URL
// This ensures PWA works on Render while maintaining browser installability stability
const manifestUrl = API_BASE_URL && !API_BASE_URL.includes('localhost')
    ? `${API_BASE_URL}/api/branding/manifest.json`
    : `/api/branding/manifest.json`;

let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;

if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
}

// Only update href if it's different to prevent the browser from 
// resetting the PWA installation state unnecessarily on refresh.
const absoluteManifestUrl = new URL(manifestUrl, window.location.origin).href;
if (manifestLink.href !== absoluteManifestUrl) {
    manifestLink.href = manifestUrl;
    console.log(`PWA: Manifest updated to ${manifestUrl}`);
}
