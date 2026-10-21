import '@fontsource-variable/montserrat'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { cargarCatalogo } from './data/useProducts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Pantalla de carga: se oculta cuando la página terminó de cargar, el catálogo llegó de Supabase y las fotos
// visibles terminaron de bajar, con un mínimo de 1,2 s para que se vea la animación.
const LOADER_MIN_MS = 1200
// Tope para esperar las fotos: si alguna tarda, la página se muestra igual y la foto termina de cargar a la vista
const IMAGENES_MAX_MS = 2500
const loaderStart = performance.now()
let loaderDone = false

function hideLoader() {
  const loader = document.getElementById('loader')
  if (loaderDone || !loader) return
  loaderDone = true
  loader.classList.add('hidden')
  setTimeout(() => loader.remove(), 500)
}

const esperar = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const siguienteFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const paginaCargada = new Promise<void>((resolve) => {
  if (document.readyState === 'complete') resolve()
  else window.addEventListener('load', () => resolve(), { once: true })
})

// Fotos dentro de la pantalla que todavía no terminaron (las lazy empiezan a bajar apenas se pintan)
function imagenesVisibles() {
  const pendientes = [...document.querySelectorAll<HTMLImageElement>('#root img')].filter((img) => {
    if (img.complete) return false
    const r = img.getBoundingClientRect()
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight
  })
  return Promise.all(
    pendientes.map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true })
          img.addEventListener('error', resolve, { once: true })
        }),
    ),
  )
}

async function esperarContenido() {
  // El panel de admin no usa el catálogo de la tienda
  const catalogo = location.pathname.startsWith('/admin') ? null : cargarCatalogo().catch(() => null)
  await Promise.all([paginaCargada, catalogo])
  // Dos frames para que React pinte las tarjetas con el catálogo ya resuelto
  await siguienteFrame()
  await siguienteFrame()
  await Promise.race([imagenesVisibles(), esperar(IMAGENES_MAX_MS)])
  await esperar(LOADER_MIN_MS - (performance.now() - loaderStart))
  hideLoader()
}

void esperarContenido()

// Red de seguridad: nunca dejar la pantalla de carga trabada.
setTimeout(hideLoader, 8000)
