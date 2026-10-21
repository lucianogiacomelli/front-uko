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

// Ruedita para botones y acciones en curso. Gira solo si el sistema no pide reducir el movimiento.
export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin ${className}`}
    />
  )
}

// Texto de un botón con la ruedita mientras dura la acción
export function Ocupado({ activo, texto, children }: { activo: boolean; texto: string; children: React.ReactNode }) {
  if (!activo) return <>{children}</>
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner />
      {texto}
    </span>
  )
}

const BLOQUE = 'rounded bg-linea motion-safe:animate-pulse'

// Esqueleto mientras carga una pantalla: imita la lista o el formulario que va a aparecer
export function Cargando({ tipo = 'lista', filas = 6 }: { tipo?: 'lista' | 'formulario'; filas?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="fade-in">
      <div className={`mb-5 h-8 w-48 rounded-lg ${BLOQUE}`} />
      {tipo === 'lista' ? (
        <ul className="divide-y divide-linea overflow-hidden rounded-2xl border border-linea bg-white">
          {Array.from({ length: filas }, (_, i) => (
            <li key={i} className="flex items-center gap-4 px-4 py-3">
              <div className={`h-11 w-11 shrink-0 rounded-lg ${BLOQUE}`} />
              <div className="flex-1 space-y-2">
                <div className={`h-3.5 w-2/3 ${BLOQUE}`} />
                <div className={`h-3 w-1/3 ${BLOQUE}`} />
              </div>
              <div className={`h-4 w-16 ${BLOQUE}`} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-1 gap-5 rounded-2xl border border-linea bg-white p-5 sm:p-6">
          {Array.from({ length: filas }, (_, i) => (
            <div key={i} className="space-y-2">
              <div className={`h-3 w-24 ${BLOQUE}`} />
              <div className={`h-9 w-full rounded-lg ${BLOQUE}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Barra de acciones de un formulario: en el celular queda fija abajo para no tener que bajar hasta el final
export function BarraAcciones({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-5 flex justify-end gap-3 border-t border-linea bg-crema-claro/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
      {children}
    </div>
  )
}
