
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { initGA } from './utils/analytics'

// SPA routing fix: handle 404.html redirect (for Render static hosting)
// When 404.html redirects to /?_r=/some/path, we restore the real path
(function() {
  const search = window.location.search;
  if (search.includes('_r=')) {
    const params = new URLSearchParams(search);
    const redirectPath = params.get('_r');
    if (redirectPath && redirectPath !== '/') {
      const newUrl = redirectPath + (window.location.hash || '');
      window.history.replaceState(null, '', newUrl);
    }
  }
})();

// Initialize Google Analytics
const gaId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID
if (gaId && gaId !== 'GA_MEASUREMENT_ID') {
  initGA(gaId)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
