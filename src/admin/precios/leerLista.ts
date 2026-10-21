// Lectura de listas de precios en el navegador (PDF o Word): las de los proveedores y la nuestra.
// Cada renglón con un nombre y un precio al final es una fila; el resto (títulos, notas) se ignora.

// seccion: último título leído antes de la fila (la categoría en nuestra lista)
export type FilaProveedor = { nombre: string; precio: number; seccion: string }
type Leida = Omit<FilaProveedor, 'seccion'>

// Viñetas de lista: las nuestras (●) y las que ponen Word o Google Docs al exportar a PDF
const VIÑETA = /^[●•▪◦·]\s*/

const NUMERO = String.raw`\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?`
// Uno o varios precios al final del renglón: "19.760,00", "$ 7.560,00", "13280", "$3.087,50 / $7.925,00"
const PRECIOS_FINALES = new RegExp(String.raw`\$?\s*(?:${NUMERO})(?:\s*\/\s*\$?\s*(?:${NUMERO}))*$`)
// Marcas sueltas que algunos proveedores ponen después del precio ("S", "S/S")
const MARCAS_FINALES = /(?:\s+[A-Z](?:\/[A-Z])?)+$/
// Notas de nuestra lista después del precio: "(Base: $5.060,00)", "(Precio base: …)", "(Aplica recargo…)",
// también cortadas en "(Base:". Los paréntesis del nombre ("(Brasil)") no tienen estas palabras ni "$".
const NOTA_FINAL = /\s*\([^()]*(?:\$|base|aplica|recargo|regla)[^()]*\)?$/i

const aNumero = (s: string) => Number(s.replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.'))

// Un renglón puede dar varias filas: "Cera depilatoria (125 gr / 460 gr): $3.087,50 / $7.925,00"
// se separa en "Cera depilatoria 125 gr" y "Cera depilatoria 460 gr", como nombramos las presentaciones.
export function leerRenglon(texto: string): Leida[] {
  const t = texto
    .replace(/\s+/g, ' ')
    .trim()
    .replace(VIÑETA, '')
    .replace(NOTA_FINAL, '')
    .replace(/\s+c\/u\.?$/i, '')
    .replace(MARCAS_FINALES, '')
  const m = t.match(PRECIOS_FINALES)
  if (!m || m.index === undefined) return []
  const nombre = t
    .slice(0, m.index)
    .replace(/[\s:$-]+$/, '')
    .trim()
  // Alcanza con una letra ("Q10", "K2+D3"); descarta renglones que son solo números
  if (nombre.length < 2 || !/\p{L}/u.test(nombre)) return []
  const precios = m[0].split('/').map(aNumero)
  if (precios.some((p) => !(p > 0))) return []
  if (precios.length === 1) return [{ nombre, precio: precios[0] }]

  const grupo = parentesisFinal(nombre)
  const etiquetas = grupo?.dentro.split(' / ').map((e) => e.trim()) ?? []
  // Sin una presentación por precio no se sabe a cuál corresponde cada uno
  if (!grupo || etiquetas.length !== precios.length) return []
  return etiquetas.map((e, i) => ({ nombre: `${grupo.antes} ${e}`, precio: precios[i] }))
}

// Separa "Aceite (100 cc / 360 cc (vidrio))" en "Aceite" y "100 cc / 360 cc (vidrio)", respetando paréntesis anidados
function parentesisFinal(texto: string): { antes: string; dentro: string } | null {
  if (!texto.endsWith(')')) return null
  let nivel = 0
  for (let i = texto.length - 1; i >= 0; i--) {
    if (texto[i] === ')') nivel++
    else if (texto[i] === '(' && --nivel === 0) return { antes: texto.slice(0, i).trim(), dentro: texto.slice(i + 1, -1) }
  }
  return null
}

type Pieza = { x: number; y: number; texto: string }
type Renglon = { x: number; texto: string }

// Junta las piezas de texto que están a la misma altura (±2 pt) en renglones, de arriba hacia abajo
function renglones(piezas: Pieza[]): Renglon[] {
  const ordenadas = [...piezas].sort((a, b) => b.y - a.y || a.x - b.x)
  const grupos: Pieza[][] = []
  for (const p of ordenadas) {
    const ultimo = grupos.at(-1)
    if (ultimo && Math.abs(ultimo[0].y - p.y) <= 2) ultimo.push(p)
    else grupos.push([p])
  }
  return grupos.map((g) => {
    g.sort((a, b) => a.x - b.x)
    return { x: g[0].x, texto: g.map((p) => p.texto).join(' ') }
  })
}

// Un producto largo sigue en el renglón de abajo. Se pega al anterior cuando:
// - la lista usa viñetas y el renglón está más a la derecha que la viñeta (los títulos, más a la izquierda, cortan), o
// - el anterior quedó abierto ("… / 1 kg):", "… 1 lt /") o el renglón arranca con un precio ("$80.040,00").
function unirContinuaciones(lineas: Renglon[]): string[] {
  const resultado: string[] = []
  let viñetaX: number | null = null
  for (const l of lineas) {
    const anterior = resultado.at(-1)
    if (VIÑETA.test(l.texto)) {
      resultado.push(l.texto)
      viñetaX = l.x
    } else if (anterior !== undefined && ((viñetaX !== null && l.x > viñetaX + 5) || /[/:,(]$/.test(anterior) || /^[$/]/.test(l.texto))) {
      resultado[resultado.length - 1] = `${anterior} ${l.texto}`
    } else {
      resultado.push(l.texto)
      viñetaX = null
    }
  }
  return resultado
}

async function leerPdf(file: File): Promise<FilaProveedor[]> {
  // pdf.js pesa bastante: se descarga solo al usar esta pantalla
  const pdfjs = await import('pdfjs-dist')
  const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

  const tarea = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const doc = await tarea.promise
  const filas: FilaProveedor[] = []
  let seccion = ''
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent()
    const piezas = items.flatMap((it) =>
      'str' in it && it.str.trim() ? [{ x: it.transform[4] as number, y: it.transform[5] as number, texto: it.str }] : [],
    )
    for (const r of unirContinuaciones(renglones(piezas))) {
      const leidas = leerRenglon(r)
      // Un renglón sin precio y sin viñeta es un título: las filas que siguen pertenecen a él
      if (leidas.length === 0 && !VIÑETA.test(r)) seccion = r.trim()
      for (const f of leidas) filas.push({ ...f, seccion })
    }
  }
  await tarea.destroy()
  return filas
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

// Word (.docx), por ejemplo la lista exportada y editada en Word o Google Docs.
// Cada párrafo es un renglón; los de lista con viñetas son productos y los demás, títulos.
async function leerDocx(file: File): Promise<FilaProveedor[]> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) throw new Error(`${file.name} no es un documento de Word válido.`)
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const filas: FilaProveedor[] = []
  let seccion = ''
  for (const p of doc.getElementsByTagNameNS(W, 'p')) {
    const texto = [...p.getElementsByTagNameNS(W, 't')].map((t) => t.textContent).join('').trim()
    if (!texto) continue
    const leidas = leerRenglon(texto)
    const viñeta = p.getElementsByTagNameNS(W, 'numPr').length > 0 || VIÑETA.test(texto)
    if (leidas.length === 0 && !viñeta) seccion = texto
    for (const f of leidas) filas.push({ ...f, seccion })
  }
  return filas
}

export function leerLista(file: File): Promise<FilaProveedor[]> {
  return /\.docx$/i.test(file.name) ? leerDocx(file) : leerPdf(file)
}
