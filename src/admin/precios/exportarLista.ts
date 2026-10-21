import { fetchCategorias, fetchProducts } from '../../data/products'
import type { Product } from '../../types/product'

// Lista de precios para clientes, con el mismo formato que la lista impresa del local:
// A4, logo arriba en cada página, título, categorías en negrita subrayadas y productos con viñeta.
// Solo precios de venta: nunca costos ni precios del proveedor.
// Medidas en puntos (1 pt = 1/72 pulgada).
const PAGINA = { ancho: 596, alto: 842 }
const MARGEN = { izquierda: 72, derecha: 72, abajo: 72 }
const LOGO = { ancho: 235, arriba: 32 }
const INICIO_PRIMERA = 150
const INICIO_RESTO = 148
const RENGLON = 15.5
const VINETA_X = 93
const TEXTO_X = 108

type Seccion = { titulo: string; renglones: string[] }

const moneda = (n: number) => `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// "Cera depilatoria (125 gr / 460 gr): $3.087,50 / $7.925,00", como en la lista impresa
function renglonProducto(p: Product): string | null {
  const variantes = p.variantes.filter((v) => v.disponible)
  if (variantes.length === 0) return null
  if (variantes.length === 1 && p.variantes.length === 1) return `${p.nombre}: ${moneda(variantes[0].precio)}`
  return `${p.nombre} (${variantes.map((v) => v.etiqueta).join(' / ')}): ${variantes.map((v) => moneda(v.precio)).join(' / ')}`
}

// Categorías con sus productos disponibles, en el orden en que se muestran
async function armarLista(): Promise<Seccion[]> {
  const [productos, categorias] = await Promise.all([fetchProducts(), fetchCategorias()])
  return categorias
    .map((cat) => ({
      titulo: cat.nombre,
      renglones: productos
        .filter((p) => p.categoriaId === cat.id && p.disponible)
        .map(renglonProducto)
        .filter((r): r is string => r !== null),
    }))
    .filter((s) => s.renglones.length > 0)
}

async function base64(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

// El logo original es enorme: se achica en un canvas antes de meterlo en el documento
async function logoReducido(): Promise<{ canvas: HTMLCanvasElement; alto: number }> {
  const img = new Image()
  img.src = '/brand/logo-uko.png'
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = 1000
  canvas.height = Math.round((1000 * img.naturalHeight) / img.naturalWidth)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { canvas, alto: (LOGO.ancho * canvas.height) / canvas.width }
}

const nombreArchivo = (ext: string) => `Lista de precios ${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.${ext}`

export async function exportarListaPdf() {
  const [{ jsPDF }, regular, negrita, logo, secciones] = await Promise.all([
    import('jspdf'),
    base64('/fonts/montserrat-400.ttf'),
    base64('/fonts/montserrat-700.ttf'),
    logoReducido(),
    armarLista(),
  ])

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  doc.addFileToVFS('Montserrat-Regular.ttf', regular)
  doc.addFont('Montserrat-Regular.ttf', 'Montserrat', 'normal')
  doc.addFileToVFS('Montserrat-Bold.ttf', negrita)
  doc.addFont('Montserrat-Bold.ttf', 'Montserrat', 'bold')
  doc.setTextColor(0, 0, 0)

  const logoUrl = logo.canvas.toDataURL('image/png')
  const ponerLogo = () =>
    doc.addImage(logoUrl, 'PNG', (PAGINA.ancho - LOGO.ancho) / 2, LOGO.arriba, LOGO.ancho, logo.alto, 'logo', 'FAST')
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

  secciones.forEach((s, n) => {
    if (n > 0) y += RENGLON
    // El título de la categoría no queda solo al pie de la página
    lugar(RENGLON * 2)
    doc.setFont('Montserrat', 'bold').setFontSize(11)
    doc.text(s.titulo, MARGEN.izquierda, y)
    doc.setLineWidth(0.6).line(MARGEN.izquierda, y + 1.5, MARGEN.izquierda + doc.getTextWidth(s.titulo), y + 1.5)
    y += RENGLON + 1.5

    doc.setFont('Montserrat', 'normal').setFontSize(11)
    for (const r of s.renglones) {
      const partes: string[] = doc.splitTextToSize(r, anchoTexto)
      lugar(RENGLON * partes.length)
      doc.circle(VINETA_X, y - 3.6, 1.9, 'F')
      partes.forEach((parte, i) => doc.text(parte, TEXTO_X, y + i * RENGLON))
      y += RENGLON * partes.length
    }
  })

  doc.save(nombreArchivo('pdf'))
}

// Word (.docx) para editar en Word o Google Docs. Mismo contenido y estructura que el PDF:
// la lista editada se puede volver a subir en Precios > "Lista con precios finales".
export async function exportarListaDocx() {
  const [docx, logo, secciones] = await Promise.all([import('docx'), logoReducido(), armarLista()])
  const { AlignmentType, Document, Header, ImageRun, LevelFormat, Packer, Paragraph, TextRun, UnderlineType } = docx
  const twips = (pt: number) => Math.round(pt * 20)
  const px = (pt: number) => Math.round((pt * 96) / 72)
  const logoPng = new Uint8Array(await (await new Promise<Blob>((ok) => logo.canvas.toBlob((b) => ok(b!), 'image/png'))).arrayBuffer())

  const documento = new Document({
    styles: { default: { document: { run: { font: 'Montserrat', size: 22 } } } },
    numbering: {
      config: [
        {
          reference: 'productos',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '●',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: twips(TEXTO_X - MARGEN.izquierda), hanging: twips(TEXTO_X - VINETA_X) } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: twips(PAGINA.ancho), height: twips(PAGINA.alto) },
            margin: {
              top: twips(INICIO_RESTO - 13),
              bottom: twips(MARGEN.abajo),
              left: twips(MARGEN.izquierda),
              right: twips(MARGEN.derecha),
              header: twips(LOGO.arriba),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new ImageRun({ type: 'png', data: logoPng, transformation: { width: px(LOGO.ancho), height: px(logo.alto) } })],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ spacing: { after: twips(8) }, children: [new TextRun({ text: 'LISTA DE PRECIOS', bold: true, size: 26 })] }),
          ...secciones.flatMap((s, n) => [
            new Paragraph({
              keepNext: true,
              spacing: { before: n > 0 ? twips(RENGLON) : 0 },
              children: [new TextRun({ text: s.titulo, bold: true, underline: { type: UnderlineType.SINGLE } })],
            }),
            ...s.renglones.map((r) => new Paragraph({ numbering: { reference: 'productos', level: 0 }, children: [new TextRun(r)] })),
          ]),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(documento)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo('docx')
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
