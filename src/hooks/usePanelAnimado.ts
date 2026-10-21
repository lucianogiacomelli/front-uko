import { useEffect, useState, type AnimationEvent } from 'react'

// Margen por si la animación de cierre no avisa que terminó (pestaña en segundo plano, etc.)
const SALIDA_MAX_MS = 600

// Para paneles que entran y salen animados (menú, filtros).
// Al cerrar, el panel sigue montado hasta que termina su animación de salida y después se quita.
// El panel tiene que recibir onAnimationEnd={alTerminarAnimacion}.
export function usePanelAnimado(open: boolean) {
  const [montado, setMontado] = useState(open)
  const [openAnterior, setOpenAnterior] = useState(open)

  // Al abrir se monta en el mismo render, sin esperar a un efecto
  if (open !== openAnterior) {
    setOpenAnterior(open)
    if (open) setMontado(true)
  }

  // Sin animaciones (reducir movimiento) se quita enseguida; si no, como respaldo del evento
  useEffect(() => {
    if (open || !montado) return
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => setMontado(false), reducir ? 0 : SALIDA_MAX_MS)
    return () => window.clearTimeout(t)
  }, [open, montado])

  function alTerminarAnimacion(e: AnimationEvent) {
    // Solo la animación del propio panel, no las de sus hijos
    if (!open && e.target === e.currentTarget) setMontado(false)
  }

  return { montado, cerrando: montado && !open, alTerminarAnimacion }
}
