type Props = { className?: string }

export function SearchIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function HomeIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 3 2.5 11h2.5v9h5.5v-6h3v6H19v-9h2.5z" />
    </svg>
  )
}

export function BagIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M8 7V6a4 4 0 0 1 8 0v1h3.2l1 14H3.8l1-14zm2 0h4V6a2 2 0 0 0-4 0z" />
    </svg>
  )
}

export function TagIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  )
}

export function CartIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2" />
      <circle cx="9.5" cy="19.5" r="1.5" />
      <circle cx="17" cy="19.5" r="1.5" />
    </svg>
  )
}

export function LeafIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.5 3.5C11 3.5 4 8 4 15.5c0 1.6.4 3 1 4.2l-2 1.8 1.1 1.2 2-1.8c1.2.7 2.6 1.1 4.1 1.1 7.5 0 10.3-8.5 10.3-18.5M7 17.5c2.5-4 5.5-6.6 9.5-8.5-3.4 2.4-6 5.2-8.1 9.2z" />
    </svg>
  )
}
