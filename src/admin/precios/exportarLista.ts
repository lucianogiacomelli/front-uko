import { fetchCategorias, fetchProducts } from '../../data/products'
import type { Product } from '../../types/product'

// Lista de precios para clientes en PDF, con el mismo formato que la lista impresa del local:
// A4, logo arriba en cada página, título, categorías en negrita subrayadas y productos con viñeta.
// Medidas en puntos (1 pt = 1/72 pulgada).
const PAGINA = { ancho: 596, alto: 842 }
const MARGEN = { izquierda: 72, derecha: 72, abajo: 72 }
const LOGO = { ancho: 235, arriba: 32 }
const INICIO_PRIMERA = 150
const INICIO_RESTO = 148
const RENGLON = 15.5
const VINETA_X = 93
const TEXTO_X = 108

const moneda = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// "Cera depilatoria (125 gr / 460 gr): $3.087,50 / $7.925,00", como en la lista impresa
function renglonProducto(p: Product): string | null {
  const variantes = p.variantes.filter((v) => v.disponible)
  if (variantes.length === 0) return null
  if (variantes.length === 1 && p.variantes.length === 1) return `${p.nombre}: ${moneda(variantes[0].precio)}`
  return `${p.nombre} (${variantes.map((v) => v.etiqueta).join(' / ')}): ${variantes.map((v) => moneda(v.precio)).join(' / ')}`
}

async function base64(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

// El logo original es enorme: se achica en un canvas antes de meterlo en el PDF
async function logoReducido(): Promise<{ url: string; alto: number }> {
  const img = new Image()
  img.src = '/brand/logo-uko.png'
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = 1000
  canvas.height = Math.round((1000 * img.naturalHeight) / img.naturalWidth)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { url: canvas.toDataURL('image/png'), alto: (LOGO.ancho * canvas.height) / canvas.width }
}

export async function exportarListaPdf() {
  const [{ jsPDF }, regular, negrita, logo, productos, categorias] = await Promise.all([
    import('jspdf'),
    base64('/fonts/montserrat-400.ttf'),
    base64('/fonts/montserrat-700.ttf'),
    logoReducido(),
    fetchProducts(),
    fetchCategorias(),
  ])

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.addFileToVFS('Montserrat-Regular.ttf', regular)
  doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal')
  doc.addFileToVFS('Montserrat-Bold.ttf', negrita)
  doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold')
  doc.setTextColor(0, 0, 0)

  const ponerLogo = () =>
    doc.addImage(logo.url, 'PNG', (PAGINA.ancho - LOGO.ancho) / 2, LOGO.arriba, LOGO.ancho, logo.alto, 'logo', 'FAST')
  const anchoTexto = PAGINA.ancho - TEXTO_X - MARGEN.derecha
  let y = INICIO_PRIMERA

  // Pasa a la página siguiente si no entran `alto` puntos más
  function lugar(alto: number) {
    if (y + alto <= PAGINA.alto - MARGEN.abajo) return
    doc.addPage()
    ponerLogo()
    y = INICIO_RESTO
  }

  ponerLogo()
  doc.setFont('Montserrat', 'bold').setFontSize(13)
  doc.text('LISTA DE PRECIOS', MARGEN.izquierda, y)
  y += 21

  let primera = true
  for (const cat of categorias) {
    const renglones = productos
      .filter((p) => p.categoriaId === cat.id && p.disponible)
      .map(renglonProducto)
      .filter((r): r is string => r !== null)
    if (renglones.length === 0) continue

    if (!primera) y += RENGLON
    primera = false
    // El título de la categoría no queda solo al pie de la página
    lugar(RENGLON * 2)
    doc.setFont('Montserrat', 'bold').setFontSize(11)
    doc.text(cat.nombre, MARGEN.izquierda, y)
    doc.setLineWidth(0.6).line(MARGEN.izquierda, y + 1.5, MARGEN.izquierda + doc.getTextWidth(cat.nombre), y + 1.5)
    y += RENGLON + 1.5

    doc.setFont('Montserrat', 'normal').setFontSize(11)
    for (const r of renglones) {
      const partes: string[] = doc.splitTextToSize(r, anchoTexto)
      lugar(RENGLON * partes.length)
      doc.circle(VINETA_X, y - 3.6, 1.9, 'F')
      partes.forEach((parte, i) => doc.text(parte, TEXTO_X, y + i * RENGLON))
      y += RENGLON * partes.length
    }
  }

  const hoy = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
  doc.save(`Lista de precios ${hoy}.pdf`)
}
