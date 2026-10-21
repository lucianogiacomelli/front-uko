// Piezas de formulario compartidas por las pantallas del admin

export function Campo({ label, ayuda, children }: { label: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold">
      <span className="mb-1 block">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs font-medium text-bordo/60">{ayuda}</span>}
    </label>
  )
}

export function Aviso({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return (
    <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
      {mensaje}
    </p>
  )
}
