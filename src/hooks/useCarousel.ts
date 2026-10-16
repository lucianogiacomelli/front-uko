import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'

// Carrusel horizontal que se mueve solo hacia la derecha.
// Se pausa con el mouse encima, al tocar, al usar flechas o al arrastrar.
// Sirve para cualquier contenedor con overflow-x: el ref va en el contenedor scrollable.
// Uso: const r = useRef(null); const c = useCarousel(r, n); <div ref={r} {...c.props}>
export function useCarousel<T extends HTMLElement>(ref: RefObject<T | null>, count: number, speed = 0.03) {
  const [paused, setPaused] = useState(false)
  const resumeTimer = useRef<number | undefined>(undefined)
  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false })

  // Pausa el autoplay un rato después de una interacción manual
  function pauseFor(ms: number) {
    setPaused(true)
    window.clearTimeout(resumeTimer.current)
    resumeTimer.current = window.setTimeout(() => setPaused(false), ms)
  }

  // Limpia el timer al desmontar
  useEffect(() => () => window.clearTimeout(resumeTimer.current), [])

  // Autoplay continuo (px por milisegundo); al llegar al final vuelve al inicio
  useEffect(() => {
    const el = ref.current
    if (!el || paused || count < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let pos = el.scrollLeft
    let last = 0
    let raf = 0
    const tick = (now: number) => {
      // Si el usuario movió el carrusel a mano, seguir desde esa posición
      if (Math.abs(el.scrollLeft - pos) > 2) pos = el.scrollLeft
      pos += speed * (now - last)
      last = now
      const max = el.scrollWidth - el.clientWidth
      if (pos >= max - 1) pos = 0
      el.scrollLeft = pos
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame((now) => {
      last = now
      tick(now)
    })
    return () => cancelAnimationFrame(raf)
  }, [paused, count, speed, ref])

  // Flechas: avanzan ~80% del ancho visible (-1 izquierda, 1 derecha)
  function mover(dir: 1 | -1) {
    const el = ref.current
    if (!el) return
    pauseFor(6000)
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  // Arrastre con mouse (en touch y trackpad el scroll nativo ya funciona)
  function onPointerDown(e: ReactPointerEvent<T>) {
    if (e.pointerType !== 'mouse' || !ref.current) return
    drag.current = { down: true, startX: e.clientX, startLeft: ref.current.scrollLeft, moved: false }
    ref.current.style.scrollBehavior = 'auto'
    setPaused(true)
  }

  function onPointerMove(e: ReactPointerEvent<T>) {
    const el = ref.current
    const d = drag.current
    if (!el || !d.down) return
    const dx = e.clientX - d.startX
    if (Math.abs(dx) > 5) d.moved = true
    el.scrollLeft = d.startLeft - dx
  }

  function onPointerUp() {
    const el = ref.current
    if (!el || !drag.current.down) return
    drag.current.down = false
    el.style.scrollBehavior = ''
    pauseFor(3000)
  }

  // Si hubo arrastre, el soltar no debe abrir el enlace
  function onClickCapture(e: ReactMouseEvent<T>) {
    if (drag.current.moved) {
      e.preventDefault()
      e.stopPropagation()
      drag.current.moved = false
    }
  }

  return {
    mover,
    // Props para el contenedor scrollable
    props: {
      onPointerEnter: () => setPaused(true),
      onPointerLeave: () => setPaused(false),
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onTouchStart: () => pauseFor(6000),
      onClickCapture,
    },
  }
}
