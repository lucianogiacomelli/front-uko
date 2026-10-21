import { useEffect } from 'react'
import { RANGOS, type Rango } from '../data/filters'
import { usePanelAnimado } from '../hooks/usePanelAnimado'

type Group = { id: string; title: string; count: number }

type Props = {
  open: boolean
  onClose: () => void
  groups: Group[]
  activeId: string | null
  onSelect: (id: string) => void
  etiquetas: string[]
  etiquetasSel: string[]
  onToggleEtiqueta: (t: string) => void
  soloDisponibles: boolean
  onSoloDisponibles: (v: boolean) => void
  rango: Rango
  onRango: (r: Rango) => void
  total: number
  onVerResultados: () => void
  hayFiltros: boolean
  onLimpiar: () => void
}

// Panel lateral de filtros y categorías. Sirve igual en desktop y mobile.
export default function FiltrosDrawer(p: Props) {
  const { open, onClose } = p
  // Sigue montado mientras dura la animación de cierre
  const { montado, cerrando, alTerminarAnimacion } = usePanelAnimado(open)

  // Cerrar con Escape y bloquear el scroll de la página mientras está abierto
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!montado) return null

  return (
    <div className={`fixed inset-0 z-50 ${cerrando ? 'pointer-events-none' : ''}`}>
      <button
        type="button"
        aria-label="Cerrar filtros"
        onClick={onClose}
        className={`${cerrando ? 'fade-out' : 'fade-in'} absolute inset-0 bg-bordo/40 backdrop-blur-sm`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filtros y categorías"
        onAnimationEnd={alTerminarAnimacion}
        className={`${cerrando ? 'drawer-out' : 'drawer-in'} absolute inset-y-0 left-0 flex w-full max-w-sm flex-col bg-crema shadow-2xl`}
      >
        <header className="flex items-center justify-between border-b border-linea px-5 py-4">
          <h2 className="text-lg font-extrabold">Filtros y categorías</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-bordo shadow-card transition hover:text-verde"
          >
            ✕
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="kicker mb-3 text-bordo/70">Categorías</h3>
            <ul className="flex flex-col gap-1">
              {p.groups.map((g) => {
                const active = p.activeId === g.id
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => p.onSelect(g.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition duration-300 ${
                        active ? 'bg-verde-claro font-extrabold text-verde' : 'font-semibold text-bordo hover:bg-white hover:text-verde'
                      }`}
                    >
                      <span className="truncate">{g.title}</span>
                      <span className="shrink-0 text-xs font-bold text-bordo/50">{g.count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="kicker text-bordo/70">Filtros</h3>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={p.soloDisponibles}
                onChange={(e) => p.onSoloDisponibles(e.target.checked)}
                className="h-4 w-4 accent-verde"
              />
              Solo disponibles
            </label>

            {p.etiquetas.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-bordo/60">Etiquetas</span>
                {p.etiquetas.map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={p.etiquetasSel.includes(t)}
                      onChange={() => p.onToggleEtiqueta(t)}
                      className="h-4 w-4 accent-verde"
                    />
                    {t}
                  </label>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-bordo/60">Precio</span>
              {RANGOS.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="radio"
                    name="rango-precio"
                    checked={p.rango === r.value}
                    onChange={() => p.onRango(r.value)}
                    className="h-4 w-4 accent-verde"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </section>
        </div>

        <footer className="flex flex-col gap-3 border-t border-linea bg-white px-5 py-4">
          <button type="button" onClick={p.onVerResultados} className="btn-pill w-full justify-center">
            Ver {p.total} {p.total === 1 ? 'producto' : 'productos'}
          </button>
          {p.hayFiltros && (
            <button
              type="button"
              onClick={p.onLimpiar}
              className="text-sm font-bold text-verde underline-offset-4 hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </footer>
      </aside>
    </div>
  )
}
