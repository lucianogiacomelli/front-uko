import { useEffect, useState, type FormEvent } from 'react'
import { fetchContacto, type Contacto as DatosContacto } from '../data/contacto'
import { guardarContacto } from './api'
import { Aviso, BarraAcciones, Campo, Cargando, Ocupado } from './ui'

// Acepta como lo copie la persona y lo deja en el formato que usa la tienda:
// "+54 9 261 651-2823" -> "5492616512823"
const limpiarWhatsapp = (s: string) => s.replace(/\D/g, '')

// "@uko.dietetica", "instagram.com/uko.dietetica" o el link completo -> "https://www.instagram.com/uko.dietetica/"
function limpiarInstagram(s: string): string {
  const t = s.trim()
  if (!t) return ''
  const usuario = t.match(/^@?([A-Za-z0-9._]+)$/)?.[1] ?? t.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1]
  return usuario ? `https://www.instagram.com/${usuario}/` : t
}

// Agrega https:// si se pegó sin él
function limpiarLink(s: string): string {
  const t = s.trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t.replace(/^http:\/\//i, 'https://') : `https://${t}`
}

function validar(c: DatosContacto): string | null {
  if (c.whatsapp && !/^\d{8,15}$/.test(c.whatsapp))
    return 'El WhatsApp tiene que tener entre 8 y 15 números, con el código de país (ej. 54 9 261 651 2823).'
  for (const [nombre, url] of [
    ['Instagram', c.instagram],
    ['Google Maps', c.googleMaps],
  ]) {
    if (!url) continue
    try {
      if (new URL(url).protocol !== 'https:') return `El link de ${nombre} tiene que empezar con https://.`
    } catch {
      return `El link de ${nombre} no es válido.`
    }
  }
  return null
}

export default function Contacto() {
  const [form, setForm] = useState<DatosContacto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    fetchContacto()
      .then(setForm)
      .catch((e: Error) => setError(`${e.message}. Si es la primera vez, falta aplicar la migración 20261023000000_contacto.sql.`))
  }, [])

  if (!form) return error ? <Aviso mensaje={error} /> : <Cargando tipo="formulario" filas={3} />

  const set = (k: keyof DatosContacto, v: string) => {
    setAviso(null)
    setForm({ ...form, [k]: v })
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const limpio: DatosContacto = {
      whatsapp: limpiarWhatsapp(form!.whatsapp),
      instagram: limpiarInstagram(form!.instagram),
      googleMaps: limpiarLink(form!.googleMaps),
    }
    const problema = validar(limpio)
    if (problema) return setError(problema)
    setForm(limpio)
    setGuardando(true)
    setError(null)
    try {
      await guardarContacto(limpio)
      setAviso('Listo: los links ya se ven en la tienda.')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setGuardando(false)
    }
  }

  const whatsapp = limpiarWhatsapp(form.whatsapp)
  const pruebas = [
    ['WhatsApp', whatsapp ? `https://wa.me/${whatsapp}` : ''],
    ['Instagram', limpiarInstagram(form.instagram)],
    ['Google Maps', limpiarLink(form.googleMaps)],
  ].filter(([, url]) => url)

  return (
    <form onSubmit={guardar} className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Contacto</h1>
      <p className="mt-1 mb-5 text-sm text-bordo/70">
        Links que aparecen en el pie de la tienda. El WhatsApp también recibe los pedidos del carrito. Dejá un campo vacío para
        ocultar el link.
      </p>

      <div className="grid grid-cols-1 gap-5 rounded-2xl border border-linea bg-white p-5 shadow-card sm:p-6">
        <Campo label="WhatsApp" ayuda="Con código de país y de área. Podés pegarlo con espacios, guiones o +.">
          <input
            inputMode="tel"
            placeholder="+54 9 261 651 2823"
            value={form.whatsapp}
            onChange={(e) => set('whatsapp', e.target.value)}
            className="campo"
          />
        </Campo>
        <Campo label="Instagram" ayuda="El usuario (@uko.dietetica) o el link del perfil.">
          <input
            placeholder="@uko.dietetica"
            value={form.instagram}
            onChange={(e) => set('instagram', e.target.value)}
            className="campo"
          />
        </Campo>
        <Campo label="Google Maps" ayuda="En Google Maps: buscá el local, tocá Compartir y copiá el link.">
          <input
            inputMode="url"
            placeholder="https://maps.app.goo.gl/…"
            value={form.googleMaps}
            onChange={(e) => set('googleMaps', e.target.value)}
            className="campo"
          />
        </Campo>

        {pruebas.length > 0 && (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-bordo/60">Probar:</span>
            {pruebas.map(([nombre, url]) => (
              <a key={nombre} href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-verde hover:underline">
                {nombre} ↗
              </a>
            ))}
          </p>
        )}
      </div>

      <Aviso mensaje={error} />
      {aviso && <p className="mt-4 rounded-lg bg-verde-claro px-4 py-2 text-sm font-semibold">{aviso}</p>}

      <BarraAcciones>
        <button type="submit" disabled={guardando} className="btn-pill disabled:opacity-60">
          <Ocupado activo={guardando} texto="Guardando…">
            Guardar
          </Ocupado>
        </button>
      </BarraAcciones>
    </form>
  )
}
