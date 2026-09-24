import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted, never fetched from Google — see the note in index.html.
import '@fontsource-variable/pixelify-sans/wght.css'
import '@fontsource-variable/space-grotesk/wght.css'
import '@fontsource/silkscreen/400.css'
import '@fontsource/silkscreen/700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
