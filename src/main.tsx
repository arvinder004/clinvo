import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initBrowserAdapter } from './lib/browserAdapter'
import './index.css'
import App from './App.tsx'

initBrowserAdapter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
