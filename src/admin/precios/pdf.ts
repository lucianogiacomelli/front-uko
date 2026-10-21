// Lectura de la lista de precios del proveedor (PDF) en el navegador.
// Cada renglón con un nombre y un precio al final es una fila; el resto (títulos, notas) se ignora.

export type FilaProveedor = { nombre: string; costo: number }

// Precio al final del renglón: "19.760,00", "$ 7.560,00" o "13280"
const PRECIO_FINAL = /\$?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)$/
// Marcas sueltas que algunos proveedores ponen después del precio ("S", "S/S")
const MARCAS_FINALES = /(?:\s+[A-Z](?:\/[A-Z])?)+$/

export function leerRenglon(texto: string): FilaProveedor | null {
  const t = texto.replace(/\s+/g, ' ').trim().replace(MARCAS_FINALES, '')
  const m = t.match(PRECIO_FINAL)
  if (!m || m.index === undefined) return null
  const nombre = t
    .slice(0, m.index)
    .replace(/[\s:$-]+$/, '')
    .trim()
  if (!/\p{L}{3}/u.test(nombre)) return null
  const costo = Number(m[1].replace(/\./g, '').replace(',', '.'))
  return costo > 0 ? { nombre, costo } : null
}

type Pieza = { x: number; y: number; texto: string }

// Junta las piezas de texto que están a la misma altura (±2 pt) en renglones, de arriba hacia abajo
function renglones(piezas: Pieza[]): string[] {
  const ordenadas = [...piezas].sort((a, b) => b.y - a.y || a.x - b.x)
  const grupos: Pieza[][] = []
  for (const p of ordenadas) {
    const ultimo = grupos.at(-1)
    if (ultimo && Math.abs(ultimo[0].y - p.y) <= 2) ultimo.push(p)
    else grupos.push([p])
  }
  return grupos.map((g) =>
    g
      .sort((a, b) => a.x - b.x)
      .map((p) => p.texto)
      .join(' '),
  )
}

export async function leerPdf(file: File): Promise<FilaProveedor[]> {
  // pdf.js pesa bastante: se descarga solo al usar esta pantalla
  const pdfjs = await import('pdfjs-dist')
  const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

  const tarea = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const doc = await tarea.promise
  const filas: FilaProveedor[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent()
    const piezas = items.flatMap((it) =>
      'str' in it && it.str.trim() ? [{ x: it.transform[4] as number, y: it.transform[5] as number, texto: it.str }] : [],
    )
    for (const r of renglones(piezas)) {
      const fila = leerRenglon(r)
      if (fila) filas.push(fila)
    }
  }
  await tarea.destroy()
  return filas
}
