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
const existingManifest = document.querySelector('link[rel="manifest"]');
if (existingManifest) existingManifest.remove();

const manifestLink = document.createElement('link');
manifestLink.rel = 'manifest';
// Ensure the path is absolute using API_BASE_URL if it's available, 
// otherwise fallback to relative for development proxies.
const manifestUrl = API_BASE_URL && !API_BASE_URL.includes('localhost')
    ? `${API_BASE_URL}/api/branding/manifest.json`
    : `/api/branding/manifest.json`;

manifestLink.href = manifestUrl;
document.head.appendChild(manifestLink);

console.log(`PWA: Manifest linked to ${manifestUrl}`);
