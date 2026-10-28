// Lectura de listas en planilla (Excel .xlsx o CSV). A diferencia del PDF, las columnas vienen separadas:
// si hay una fila de encabezado ("Descripción", "Precio") se usan esas columnas; si no, cada fila toma
// su último número como precio y los textos anteriores como nombre.
import { leerRenglon, type FilaProveedor } from './leerLista'

type Celda = string | number
type Hoja = { nombre: string; filas: Celda[][] }
type Leida = Omit<FilaProveedor, 'seccion'>

const COL_NOMBRE = /descrip|producto|art[ií]culo|nombre|detalle/i
const COL_PRECIO = /precio|costo|importe|valor/i
// Entre varias columnas de precio se prefiere la del costo, no la sugerida para vender
const COL_PRECIO_VENTA = /sugerid|p[uú]blico|venta/i
const LETRA = /\p{L}/u

// Las celdas numéricas del Excel ya son números. Los textos aceptan "1.234,50", "$ 1234", "1,234.50" o "15.5"
function numero(c: Celda | undefined): number {
  if (typeof c === 'number') return c
  const s = (c ?? '').replace(/[$\s]/g, '')
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$|^\d+,\d+$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'))
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s)) return Number(s.replace(/,/g, ''))
  if (/^\d+(?:\.\d+)?$/.test(s)) return Number(s)
  return NaN
}

const texto = (c: Celda | undefined) => String(c ?? '').replace(/\s+/g, ' ').trim()

// Busca en las primeras filas una con columna de nombre y columna de precio distintas
// (un título como "Lista de precios de productos" tiene las dos palabras en la misma celda)
function encabezado(filas: Celda[][]) {
  for (const [n, celdas] of filas.slice(0, 30).entries()) {
    const textos = celdas.map(texto)
    const nombre = textos.findIndex((t) => COL_NOMBRE.test(t) && !/c[oó]d/i.test(t))
    const precios = textos.flatMap((t, i) => (i !== nombre && COL_PRECIO.test(t) ? [i] : []))
    if (nombre >= 0 && precios.length) return { fila: n, nombre, precio: precios.find((i) => !COL_PRECIO_VENTA.test(textos[i])) ?? precios[0] }
  }
  return null
}

function porPosicion(celdas: Celda[]): Leida[] {
  const i = celdas.findLastIndex((c) => numero(c) > 0)
  // Sin celda de precio puede ser un renglón entero en una celda: "Almendras x kg $15.000"
  if (i < 0) return leerRenglon(celdas.map(texto).join(' '))
  const nombre = celdas.slice(0, i).map(texto).filter((t) => LETRA.test(t)).join(' ')
  return nombre.length >= 2 ? [{ nombre, precio: numero(celdas[i]) }] : []
}

function leerTabla(hojas: Hoja[]): FilaProveedor[] {
  const filas: FilaProveedor[] = []
  for (const hoja of hojas) {
    // Con varias hojas (una por rubro, por ejemplo) el nombre de la hoja es la primera sección
    let seccion = hojas.length > 1 ? hoja.nombre : ''
    const cab = encabezado(hoja.filas)
    for (const [n, celdas] of hoja.filas.entries()) {
      if (cab && n <= cab.fila) continue
      const llenas = celdas.map(texto).filter(Boolean)
      if (llenas.length === 0) continue
      let leidas: Leida[] = []
      if (cab) {
        const nombre = texto(celdas[cab.nombre])
        const precio = numero(celdas[cab.precio])
        if (nombre.length >= 2 && LETRA.test(nombre) && precio > 0) leidas = [{ nombre, precio }]
      } else {
        leidas = porPosicion(celdas)
      }
      // Una fila con un solo texto y sin precio es un título: las filas que siguen pertenecen a él
      if (leidas.length === 0 && llenas.length === 1 && LETRA.test(llenas[0])) seccion = llenas[0]
      for (const f of leidas) filas.push({ ...f, seccion })
    }
  }
  return filas
}

const S = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

const textoXml = (el: Element) => [...el.getElementsByTagNameNS(S, 't')].map((t) => t.textContent).join('')

// "B12" -> 1
function columna(ref: string | null, siguiente: number): number {
  const letras = ref?.match(/^[A-Z]+/)?.[0]
  return letras ? [...letras].reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0) - 1 : siguiente
}

// Todas las hojas en el orden del libro
async function leerXlsx(file: File): Promise<Hoja[]> {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const xml = async (ruta: string) => {
    const t = await zip.file(ruta)?.async('string')
    return t ? new DOMParser().parseFromString(t, 'application/xml') : null
  }
  const libro = await xml('xl/workbook.xml')
  if (!libro) throw new Error(`${file.name} no es una planilla de Excel válida.`)
  const rels = await xml('xl/_rels/workbook.xml.rels')
  const destinos = new Map([...(rels?.getElementsByTagName('Relationship') ?? [])].map((r) => [r.getAttribute('Id'), r.getAttribute('Target') ?? '']))
  const compartidos = [...((await xml('xl/sharedStrings.xml'))?.getElementsByTagNameNS(S, 'si') ?? [])].map(textoXml)

  const hojas: Hoja[] = []
  for (const hoja of libro.getElementsByTagNameNS(S, 'sheet')) {
    const destino = destinos.get(hoja.getAttributeNS(R, 'id'))
    if (!destino) continue
    const doc = await xml(destino.startsWith('/') ? destino.slice(1) : `xl/${destino}`)
    if (!doc) continue
    const filas = [...doc.getElementsByTagNameNS(S, 'row')].map((row) => {
      const celdas: Celda[] = []
      for (const c of row.getElementsByTagNameNS(S, 'c')) {
        const v = c.getElementsByTagNameNS(S, 'v')[0]?.textContent ?? ''
        const tipo = c.getAttribute('t')
        const valor = tipo === 's' ? compartidos[Number(v)] : tipo === 'inlineStr' ? textoXml(c) : tipo === 'str' ? v : tipo || v === '' ? '' : Number(v)
        celdas[columna(c.getAttribute('r'), celdas.length)] = valor ?? ''
      }
      return Array.from(celdas, (c) => c ?? '')
    })
    hojas.push({ nombre: hoja.getAttribute('name') ?? '', filas })
  }
  return hojas
}

// Excel en español guarda los CSV en Windows-1252 y con ";": se prueba UTF-8 y Papa detecta el separador
async function leerCsv(file: File): Promise<Hoja[]> {
  const bytes = await file.arrayBuffer()
  let contenido: string
  try {
    contenido = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    contenido = new TextDecoder('windows-1252').decode(bytes)
  }
  const { default: Papa } = await import('papaparse')
  const { data } = Papa.parse<string[]>(contenido, { skipEmptyLines: true })
  return [{ nombre: file.name, filas: data }]
}

export async function leerPlanilla(file: File): Promise<FilaProveedor[]> {
  return leerTabla(await (/\.csv$/i.test(file.name) ? leerCsv(file) : leerXlsx(file)))
}
