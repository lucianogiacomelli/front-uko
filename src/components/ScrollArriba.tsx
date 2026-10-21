import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router'

// El navegador no resetea el scroll al navegar dentro de la app: sin esto, al pasar de una página
// scrolleada a otra se quedaba abajo. Cada cambio de página empieza arriba, también al volver atrás.
// Solo mira la ruta: buscar o filtrar en Productos (cambia ?q=…) no mueve el scroll.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

export default function ScrollArriba() {
  const { pathname } = useLocation()

  // Antes de pintar, para que no se vea un instante la página nueva scrolleada
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}
