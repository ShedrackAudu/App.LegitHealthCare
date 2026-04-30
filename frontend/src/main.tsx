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

// PWA Manifest and Service Worker registration are handled in index.html and vite-plugin-pwa
