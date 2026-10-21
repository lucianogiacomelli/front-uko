import { supabase } from '../lib/supabase'
import type { Product } from '../types/product'

// Columnas que se piden a Supabase: el producto con sus variantes en orden
export const PRODUCTO_SELECT =
  'id, nombre, categoria, descripcion, imagen, etiquetas, disponible, en_oferta, descuento, eliminado_en, variantes(etiqueta, precio, disponible, orden)'

export type ProductoRow = {
  id: string
  nombre: string
  categoria: string
  descripcion: string
  imagen: string
  etiquetas: string[]
  disponible: boolean
  en_oferta: boolean
  descuento: number
  eliminado_en: string | null
  variantes: { etiqueta: string; precio: number; disponible: boolean; orden: number }[]
}

export function toProduct(row: ProductoRow): Product {
  const variantes = [...row.variantes]
    .sort((a, b) => a.orden - b.orden)
    .map((v) => ({ etiqueta: v.etiqueta, precio: Number(v.precio), disponible: v.disponible }))
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    // Precio más bajo entre las variantes (se muestra como "Desde")
    precio: variantes.length ? Math.min(...variantes.map((v) => v.precio)) : 0,
    descripcion: row.descripcion,
    imagen: row.imagen,
    etiquetas: row.etiquetas,
    disponible: row.disponible,
    variantes,
    enOferta: row.en_oferta,
    descuento: row.descuento,
  }
}

// Solo productos no eliminados (RLS también los filtra para visitantes)
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('productos')
    .select(PRODUCTO_SELECT)
    .is('eliminado_en', null)
    .order('nombre')
    .returns<ProductoRow[]>()
  if (error) throw new Error('No se pudo cargar el catálogo')
  return data.map(toProduct)
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
