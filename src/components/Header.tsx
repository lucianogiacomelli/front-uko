import { useCallback, useState } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router'
import { useCarrito } from '../carrito/CarritoContext'
import { BagIcon, CartIcon, HomeIcon, SearchIcon, TagIcon } from './Icons'
import MenuMobile from './MenuMobile'

// hideOnDesktop: el botón solo aparece en mobile (en desktop el logo ya lleva a Home)
const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true, hideOnDesktop: true },
  { to: '/productos', label: 'Productos', icon: BagIcon, end: false, hideOnDesktop: false },
  { to: '/ofertas', label: 'Ofertas', icon: TagIcon, end: false, hideOnDesktop: false },
]

export default function Header() {
  const [params] = useSearchParams()
  const [query, setQuery] = useState(params.get('q') ?? '')
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const cerrarMenu = useCallback(() => setMenuOpen(false), [])
  const { cantidadTotal } = useCarrito()

  function search(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/productos?q=${encodeURIComponent(q)}` : '/productos')
  }

  return (
    <header className="sticky top-0 z-20 bg-crema/97 shadow-[0_8px_22px_rgba(71,14,18,0.08)]">
      <div className="relative mx-auto max-w-6xl">
        {/* Logo flotante: sobresale del fondo de la cabecera con anillo blanco y sombra */}
        <Link
          to="/"
          aria-label="UKO Dietética & Herboristería — inicio"
          className="absolute top-3 left-4 z-10 h-16 w-16 sm:left-6 sm:h-[108px] sm:w-[108px]"
        >
          <img
            src="/brand/logo-circular.png"
            alt="UKO Dietética & Herboristería"
            className="h-full w-full rounded-full border-2 border-white/95 bg-white/80 object-cover p-[3px] shadow-[0_13px_24px_rgba(71,14,18,0.27)]"
          />
        </Link>

        <div className="flex flex-col gap-3 py-3 pr-4 pl-24 sm:flex-row sm:items-center sm:gap-4 sm:py-3.5 sm:pr-6 sm:pl-[150px]">
          <div className="flex w-full items-center gap-2 sm:flex-1">
            <form onSubmit={search} role="search" className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-bordo/50" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar productos"
                aria-label="Buscar productos"
                className="h-11 w-full rounded-full border border-white/95 bg-white/90 pr-4 pl-11 text-sm text-bordo shadow-[0_7px_22px_rgba(71,14,18,0.09)] outline-none backdrop-blur placeholder:text-bordo/40 focus:border-verde sm:h-12 sm:text-[15px]"
              />
            </form>

            {/* Carrito: visible en mobile y desktop, con la cantidad de productos */}
            <Link
              to="/carrito"
              aria-label={`Ver carrito (${cantidadTotal} productos)`}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/95 bg-white/90 text-bordo shadow-[0_7px_18px_rgba(71,14,18,0.12)] backdrop-blur transition hover:text-verde active:scale-95 sm:h-12 sm:w-12"
            >
              <CartIcon className="h-5 w-5" />
              {cantidadTotal > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-bordo px-1 text-[11px] leading-none font-extrabold text-crema shadow-md">
                  {cantidadTotal}
                </span>
              )}
            </Link>

            {/* Mobile: abre el menú de navegación */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menú"
              aria-haspopup="dialog"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bordo text-crema shadow-[0_7px_18px_rgba(71,14,18,0.25)] transition active:scale-95 sm:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-5 w-5" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>

          {/* Desktop: pestañas. En mobile la navegación está en el menú */}
          <nav className="hidden gap-2 sm:flex">
            {tabs.map(({ to, label, icon: Icon, end, hideOnDesktop }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-full border border-white/95 px-4 py-2 text-sm font-bold shadow-[0_6px_17px_rgba(71,14,18,0.1)] backdrop-blur transition hover:bg-white/90 sm:px-5 ${
                    hideOnDesktop ? 'sm:hidden' : ''
                  } ${isActive ? 'bg-verde text-crema' : 'bg-white/90 text-bordo hover:text-verde'}`
                }
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="bg-verde text-crema">
        <p className="mx-auto max-w-6xl px-4 py-2 text-center text-xs font-semibold tracking-wide sm:text-sm">
          🌿 Dietética & Herboristería · productos naturales para tu día a día
        </p>
      </div>

      <MenuMobile open={menuOpen} onClose={cerrarMenu} />
    </header>
  )
}
