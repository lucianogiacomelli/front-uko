import { useEffect, useRef, useState } from 'react'

// Devuelve true una sola vez, cuando el elemento entra en pantalla (para animar al aparecer)
export function useInView<T extends Element>() {
  const ref = useRef<T>(null)
  // Sin IntersectionObserver (navegadores viejos) se muestra de una vez
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return { ref, inView }
}
