import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './styles/tokens.css'
import App from './App.jsx'

// Register service worker. autoUpdate strategy: SW takes over on next load,
// no user prompt. Skips registration in dev to avoid stale-cache headaches.
if (import.meta.env.PROD) {
  registerSW({ immediate: true })
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
