// Se achica antes de subir, así que se aceptan fotos grandes (las del celular pesan 3 a 10 MB)
const MAX_IMAGEN = 25 * 1024 * 1024
// Lado más largo al guardar: alcanza para la ficha del producto en pantallas de alta densidad
const LADO_MAX = 1200

// Redimensiona y pasa a WebP: una foto de celular queda en unos 100-200 KB.
// Si la original ya es más liviana (una imagen chica u optimizada), se usa esa.
async function comprimir(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.82))
  if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.[^.]*$/, '') + '.webp', { type: 'image/webp' })
}

// Imagen elegida y todavía no subida, con su vista previa en data URL
export type ArchivoImagen = { file: File; url: string }

type Props = {
  // URL guardada (vacía si no tiene)
  imagen: string
  archivo: ArchivoImagen | null
  onArchivo: (archivo: ArchivoImagen | null) => void
  onQuitar: () => void
  onError: (mensaje: string) => void
  redonda?: boolean
}

export default function ImagenInput({ imagen, archivo, onArchivo, onQuitar, onError, redonda }: Props) {
  const vista = archivo?.url ?? imagen

  function elegir(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) return onError('El archivo tiene que ser una imagen.')
    if (file.size > MAX_IMAGEN) return onError('La imagen pesa más de 25 MB.')
    comprimir(file)
      .then((final) => {
        const reader = new FileReader()
        reader.onload = () => onArchivo({ file: final, url: String(reader.result) })
        reader.onerror = () => onError('No se pudo leer la imagen.')
        reader.readAsDataURL(final)
      })
      .catch(() => onError('No se pudo leer la imagen. Probá con otro formato (JPG, PNG o WebP).'))
  }

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold">Imagen</legend>
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={`flex h-28 w-28 items-center justify-center overflow-hidden border border-linea bg-crema-claro ${redonda ? 'rounded-full' : 'rounded-xl'}`}
        >
          {vista ? (
            <img src={vista} alt="" className={redonda ? 'h-full w-full object-cover' : 'max-h-full max-w-full rounded-lg object-contain'} />
          ) : (
            <span className="text-xs text-bordo/50">Sin imagen</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2 text-sm">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => {
              elegir(e.target.files?.[0])
              e.target.value = ''
            }}
            className="max-w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-verde-claro file:px-4 file:py-2 file:font-bold file:text-bordo"
          />
          {vista && (
            <button
              type="button"
              onClick={() => {
                onArchivo(null)
                onQuitar()
              }}
              className="self-start font-semibold text-bordo/70 hover:text-bordo"
            >
              Quitar imagen
            </button>
          )}
        </div>
      </div>
    </fieldset>
  )
}
