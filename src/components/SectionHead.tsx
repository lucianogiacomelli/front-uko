import { Link } from 'react-router'

type Props = { kicker: string; title: string; link?: { to: string; label: string } }

export default function SectionHead({ kicker, title, link }: Props) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <span className="kicker text-verde">{kicker}</span>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {link && (
        <Link to={link.to} className="shrink-0 text-sm font-bold hover:text-verde">
          {link.label} →
        </Link>
      )}
    </div>
  )
}
