import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { usePanelAnimado } from '../hooks/usePanelAnimado'
import { BagIcon, CartIcon, HomeIcon, TagIcon } from './Icons'

// Páginas del sitio para navegar desde el menú mobile
const paginas = [
  { to: '/', label: 'Inicio', icon: HomeIcon, end: true },
  { to: '/productos', label: 'Productos', icon: BagIcon, end: false },
  { to: '/ofertas', label: 'Ofertas', icon: TagIcon, end: false },
  { to: '/carrito', label: 'Carrito', icon: CartIcon, end: false },
]

type Props = { open: boolean; onClose: () => void }

// Menú de navegación mobile: panel lateral desde la izquierda
export default function MenuMobile({ open, onClose }: Props) {
  const { pathname } = useLocation()
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
    <div className={`fixed inset-0 z-50 sm:hidden ${cerrando ? 'pointer-events-none' : ''}`}>
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
        className={`${cerrando ? 'fade-out' : 'fade-in'} absolute inset-0 bg-bordo/40 backdrop-blur-sm`}
      />

      <nav
        aria-label="Menú principal"
        onAnimationEnd={alTerminarAnimacion}
        className={`${cerrando ? 'drawer-out' : 'drawer-in'} absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-crema shadow-2xl`}
      >
        <header className="flex items-center justify-between border-b border-linea px-5 py-4">
          <h2 className="text-lg font-extrabold">Menú</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-bordo shadow-card transition hover:text-verde"
          >
            ✕
          </button>
        </header>

        <ul className="flex flex-col gap-2 p-5">
          {paginas.map(({ to, label, icon: Icon, end }) => {
            const activa = end ? pathname === to : pathname.startsWith(to)
            return (
              <li key={to}>
                <Link
                  to={to}
                  onClick={onClose}
                  aria-current={activa ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition ${
                    activa ? 'bg-verde text-crema' : 'bg-white text-bordo hover:text-verde'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
