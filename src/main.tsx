import '@fontsource-variable/montserrat'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Pantalla de carga: se oculta cuando la página terminó de cargar, con un mínimo de 1,2 s para que se vea la animación.
const LOADER_MIN_MS = 1200
const loaderStart = performance.now()
let loaderDone = false

function hideLoader() {
  const loader = document.getElementById('loader')
  if (loaderDone || !loader) return
  loaderDone = true
  loader.classList.add('hidden')
  setTimeout(() => loader.remove(), 500)
}

function hideLoaderAfterMin() {
  const left = Math.max(0, LOADER_MIN_MS - (performance.now() - loaderStart))
  setTimeout(hideLoader, left)
}

if (document.readyState === 'complete') hideLoaderAfterMin()
else window.addEventListener('load', hideLoaderAfterMin, { once: true })

// Red de seguridad: nunca dejar la pantalla de carga trabada.
setTimeout(hideLoader, 6000)
