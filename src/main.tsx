
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { initGA } from './utils/analytics'

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
