import { contacto } from '../data/contacto'

const year = new Date().getFullYear()

type IconProps = { className?: string }

function WhatsAppIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 8 19.4L3 21z" />
      <path d="M9 10.5c0 2.5 2 4.5 4.5 4.5l1-1.2-1.8-.9-.7.7c-.8-.4-1.6-1.2-2-2l.7-.7-.9-1.8L9 10.5z" />
    </svg>
  )
}

function InstagramIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" />
    </svg>
  )
}

function MapPinIcon({ className = 'h-5 w-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}

// Enlaces configurables. Mientras un valor esté vacío, el ícono apunta a "#" (boceto).
const redes = [
  {
    label: 'Escribinos por WhatsApp',
    href: contacto.whatsapp ? `https://wa.me/${contacto.whatsapp}` : '#',
    Icon: WhatsAppIcon,
  },
  { label: 'Seguinos en Instagram', href: contacto.instagram || '#', Icon: InstagramIcon },
  { label: 'Cómo llegar en Google Maps', href: contacto.googleMaps || '#', Icon: MapPinIcon },
]

export default function Footer() {
  return (
    <footer className="bg-verde-claro">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-8 text-sm sm:grid sm:grid-cols-3 sm:items-center">
        {/* Izquierda: redes */}
        <ul className="flex gap-3 sm:justify-self-start">
          {redes.map(({ label, href, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-bordo shadow-card transition duration-300 hover:-translate-y-0.5 hover:text-verde hover:shadow-[0_10px_22px_rgba(71,14,18,0.12)]"
              >
                <Icon />
              </a>
            </li>
          ))}
        </ul>

        {/* Centro: derechos */}
        <p className="text-center text-bordo/70 sm:justify-self-center">© {year} UKO Dietética & Herboristería</p>

        {/* Derecha: logo */}
        <img
          src="/brand/logo-uko.png"
          alt="UKO Dietética & Herboristería"
          className="h-12 w-auto mix-blend-multiply sm:justify-self-end"
        />
      </div>
    </footer>
  )
}
