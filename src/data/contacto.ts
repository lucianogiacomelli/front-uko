import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Redes y ubicación de la tienda. Se editan desde el admin (sección Contacto).
// Un valor vacío deja el ícono del footer apuntando a "#".
export type Contacto = {
  // Formato internacional, solo dígitos (ej. "5492616512823"). También recibe los pedidos del carrito
  whatsapp: string
  instagram: string
  googleMaps: string
}

const VACIO: Contacto = { whatsapp: '', instagram: '', googleMaps: '' }

export async function fetchContacto(): Promise<Contacto> {
  const { data, error } = await supabase.from('contacto').select('whatsapp, instagram, google_maps').eq('id', 1).maybeSingle()
  if (error) throw new Error('No se pudieron cargar los datos de contacto')
  return data ? { whatsapp: data.whatsapp, instagram: data.instagram, googleMaps: data.google_maps } : VACIO
}

// Module-level cache: el footer está en todas las páginas y no tiene que volver a pedirlo
let cache: Promise<Contacto> | null = null

export function invalidarContacto() {
  cache = null
}

export function useContacto(): Contacto {
  const [contacto, setContacto] = useState(VACIO)
  useEffect(() => {
    cache ??= fetchContacto()
    cache.then(setContacto).catch(() => {
      cache = null
    })
  }, [])
  return contacto
}
