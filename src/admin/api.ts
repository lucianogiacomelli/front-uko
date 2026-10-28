import { PRODUCTO_SELECT, toProduct, type ProductoRow } from '../data/products'
import { invalidarContacto, type Contacto } from '../data/contacto'
import { invalidarProductos } from '../data/useProducts'
import { supabase } from '../lib/supabase'
import type { Categoria, Product } from '../types/product'

const BUCKET = 'productos'

export type ProductoAdmin = Product & { eliminadoEn: string | null }
export type CategoriaAdmin = Categoria & { productos: number; margen: number }

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

// proveedor: el producto se crea desde una fila de la lista del proveedor. Se guarda en la primera
// presentación para que la próxima lista la encuentre directo
export async function guardarProducto(p: Product, nuevo: boolean, proveedor?: { costo: number | null; nombre: string }) {
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
    variantes: p.variantes.map((v, i) => (i === 0 && proveedor ? { ...v, costo: proveedor.costo, nombre_proveedor: proveedor.nombre } : v)),
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

export async function listarEtiquetas(): Promise<string[]> {
  const { data, error } = await supabase.from('etiquetas').select('nombre').order('nombre')
  if (error) fallo(error)
  return data.map((e) => e.nombre as string)
}

// Mayúsculas y espacios no cuentan: "Vegano" y " vegano" son la misma etiqueta (igual que el índice de la base)
export const claveEtiqueta = (nombre: string) => nombre.trim().replace(/\s+/g, ' ').toLowerCase()

export async function crearEtiqueta(nombre: string) {
  const { error } = await supabase.from('etiquetas').insert({ nombre })
  if (error?.code === '23505') throw new Error(`La etiqueta "${nombre}" ya existe. Seleccionala de la lista.`)
  if (error) fallo(error)
}

// Con la cantidad de productos de cada una (incluye eliminados, que también bloquean el borrado)
export async function listarCategorias(): Promise<CategoriaAdmin[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre, imagen, margen, productos(count)')
    .order('nombre')
    .returns<(Categoria & { margen: number; productos: { count: number }[] })[]>()
  if (error) fallo(error)
  return data.map((c) => ({ ...c, margen: Number(c.margen), productos: c.productos[0]?.count ?? 0 }))
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

// --- Actualización de precios desde la lista del proveedor ---

export type VariantePrecio = {
  id: string
  etiqueta: string
  precio: number
  costo: number | null
  nombreProveedor: string | null
}
export type ProductoPrecio = { id: string; nombre: string; categoriaId: string; margen: number | null; variantes: VariantePrecio[] }
export type CategoriaPrecio = { id: string; nombre: string; margen: number }

type ProductoPrecioRow = {
  id: string
  nombre: string
  categoria_id: string
  margen: number | null
  variantes: { id: string; etiqueta: string; precio: number; costo: number | null; nombre_proveedor: string | null; orden: number }[]
}

// Productos activos con sus variantes y márgenes
export async function cargarPrecios(): Promise<{ productos: ProductoPrecio[]; categorias: CategoriaPrecio[] }> {
  const [ps, cs] = await Promise.all([
    supabase
      .from('productos')
      .select('id, nombre, categoria_id, margen, variantes(id, etiqueta, precio, costo, nombre_proveedor, orden)')
      .is('eliminado_en', null)
      .order('nombre')
      .returns<ProductoPrecioRow[]>(),
    supabase.from('categorias').select('id, nombre, margen').order('nombre').returns<CategoriaPrecio[]>(),
  ])
  if (ps.error) fallo(ps.error)
  if (cs.error) fallo(cs.error)
  return {
    productos: ps.data.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoriaId: p.categoria_id,
      margen: p.margen === null ? null : Number(p.margen),
      variantes: [...p.variantes]
        .sort((a, b) => a.orden - b.orden)
        .map((v) => ({
          id: v.id,
          etiqueta: v.etiqueta,
          precio: Number(v.precio),
          costo: v.costo === null ? null : Number(v.costo),
          nombreProveedor: v.nombre_proveedor,
        })),
    })),
    categorias: cs.data.map((c) => ({ ...c, margen: Number(c.margen) })),
  }
}

export async function aplicarPrecios(
  variantes: { id: string; costo: number | null; precio: number; nombre_proveedor: string | null }[],
  categorias: { id: string; margen: number }[],
  productos: { id: string; margen: number | null }[],
): Promise<number> {
  const { data, error } = await supabase.rpc('aplicar_precios', { variantes, categorias, productos })
  if (error) fallo(error)
  invalidarProductos()
  return data as number
}

// --- Links de contacto (footer y WhatsApp de pedidos) ---

export async function guardarContacto(c: Contacto) {
  const { data, error } = await supabase
    .from('contacto')
    .update({ whatsapp: c.whatsapp, instagram: c.instagram, google_maps: c.googleMaps })
    .eq('id', 1)
    .select('id')
  if (error) fallo(error)
  // Sin fila actualizada: falta la migración o RLS no dejó escribir
  if (data.length === 0) throw new Error('No se pudo guardar. ¿Está aplicada la migración de contacto?')
  invalidarContacto()
}
