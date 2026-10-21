import { PRODUCTO_SELECT, toProduct, type ProductoRow } from '../data/products'
import { invalidarProductos } from '../data/useProducts'
import { supabase } from '../lib/supabase'
import type { Categoria, Product } from '../types/product'

const BUCKET = 'productos'

export type ProductoAdmin = Product & { eliminadoEn: string | null }
export type CategoriaAdmin = Categoria & { productos: number }

const toAdmin = (row: ProductoRow): ProductoAdmin => ({ ...toProduct(row), eliminadoEn: row.eliminado_en })

// Traduce los errores de Supabase a un mensaje para mostrar en el panel
function fallo(error: { code?: string; message: string }): never {
  if (error.code === '23505') throw new Error(error.message.startsWith('Ya existe') ? error.message : 'Ya existe un registro con ese id, nombre o presentación.')
  if (error.code === '23503') throw new Error('La categoría tiene productos (también cuentan los eliminados). Movelos o borralos primero.')
  if (error.code === '42501') throw new Error('No tenés permisos para esta acción.')
  throw new Error(error.message)
}

// Incluye los eliminados: RLS deja verlos solo a los admins
export async function listarProductos(): Promise<ProductoAdmin[]> {
  const { data, error } = await supabase.from('productos').select(PRODUCTO_SELECT).order('nombre').returns<ProductoRow[]>()
  if (error) fallo(error)
  return data.map(toAdmin)
}

export async function obtenerProducto(id: string): Promise<ProductoAdmin | null> {
  const { data, error } = await supabase.from('productos').select(PRODUCTO_SELECT).eq('id', id).returns<ProductoRow[]>().maybeSingle()
  if (error) fallo(error)
  return data ? toAdmin(data) : null
}

export async function guardarProducto(p: Product, nuevo: boolean) {
  const { error } = await supabase.rpc('guardar_producto', {
    nuevo,
    producto: {
      id: p.id,
      nombre: p.nombre,
      categoria_id: p.categoriaId,
      descripcion: p.descripcion,
      imagen: p.imagen,
      etiquetas: p.etiquetas,
      disponible: p.disponible,
      en_oferta: p.enOferta,
      descuento: p.descuento,
    },
    variantes: p.variantes,
  })
  if (error) fallo(error)
  invalidarProductos()
}

// Borrado lógico: deja de verse en la tienda, se puede restaurar
export async function marcarEliminado(id: string, eliminado: boolean) {
  const { error } = await supabase
    .from('productos')
    .update({ eliminado_en: eliminado ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) fallo(error)
  invalidarProductos()
}

// Borrado definitivo: el producto, sus variantes (cascade) y su imagen
export async function eliminarDefinitivo(p: Pick<Product, 'id' | 'imagen'>) {
  const { error } = await supabase.from('productos').delete().eq('id', p.id)
  if (error) fallo(error)
  invalidarProductos()
  await borrarImagen(p.imagen)
}

// carpeta: "productos/<id>" o "categorias/<id>"
async function subirImagen(carpeta: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${carpeta}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
  if (error) throw new Error(`No se pudo subir la imagen: ${error.message}`)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// Sube la imagen nueva (si hay), guarda y borra la anterior si cambió.
// Si el guardado falla, borra la imagen recién subida para no dejarla huérfana.
export async function guardarConImagen(
  carpeta: string,
  archivo: File | null,
  imagen: string,
  original: string,
  guardar: (imagen: string) => Promise<void>,
) {
  const subida = archivo ? await subirImagen(carpeta, archivo) : null
  const final = subida ?? imagen
  try {
    await guardar(final)
  } catch (e) {
    if (subida) await borrarImagen(subida)
    throw e
  }
  if (original && original !== final) await borrarImagen(original)
}

// Solo borra imágenes de nuestro bucket; las URLs externas se ignoran. Un fallo acá no frena la operación.
export async function borrarImagen(url: string) {
  const prefijo = supabase.storage.from(BUCKET).getPublicUrl('').data.publicUrl
  if (!url.startsWith(prefijo)) return
  await supabase.storage.from(BUCKET).remove([url.slice(prefijo.length)])
}

// Con la cantidad de productos de cada una (incluye eliminados, que también bloquean el borrado)
export async function listarCategorias(): Promise<CategoriaAdmin[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre, imagen, productos(count)')
    .order('nombre')
    .returns<(Categoria & { productos: { count: number }[] })[]>()
  if (error) fallo(error)
  return data.map((c) => ({ ...c, productos: c.productos[0]?.count ?? 0 }))
}

export async function guardarCategoria(c: Categoria, nueva: boolean) {
  const { error } = nueva
    ? await supabase.from('categorias').insert(c)
    : await supabase.from('categorias').update({ nombre: c.nombre, imagen: c.imagen }).eq('id', c.id)
  if (error) fallo(error)
  invalidarProductos()
}

export async function eliminarCategoria(c: Pick<Categoria, 'id' | 'imagen'>) {
  const { error } = await supabase.from('categorias').delete().eq('id', c.id)
  if (error) fallo(error)
  invalidarProductos()
  await borrarImagen(c.imagen)
}
