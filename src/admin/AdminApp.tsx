import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router'
import { supabase } from '../lib/supabase'
import Contacto from './Contacto'
import EditarCategoria from './EditarCategoria'
import EditarProducto from './EditarProducto'
import ListaCategorias from './ListaCategorias'
import ListaProductos from './ListaProductos'
import Login from './Login'
import ActualizarPrecios from './precios/ActualizarPrecios'
import { Spinner } from './ui'

// Secciones del menú: cada una queda marcada también en sus pantallas internas (editar, nueva…)
const SECCIONES = [
  { to: '/admin', label: 'Productos', activa: (p: string) => p === '/admin' || p.startsWith('/admin/producto') },
  { to: '/admin/categorias', label: 'Categorías', activa: (p: string) => p.startsWith('/admin/categorias') },
  { to: '/admin/precios', label: 'Precios', activa: (p: string) => p.startsWith('/admin/precios') },
  { to: '/admin/contacto', label: 'Contacto', activa: (p: string) => p.startsWith('/admin/contacto') },
]

type Estado = { tipo: 'cargando' } | { tipo: 'anonimo' } | { tipo: 'sinPermiso'; email: string } | { tipo: 'admin'; email: string }

// Sesión de Supabase Auth + verificación contra public.admins.
// La seguridad real la hace RLS en la base: esto solo decide qué pantalla mostrar.
function useEstadoAdmin(): Estado {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [esAdmin, setEsAdmin] = useState<{ userId: string; ok: boolean } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let vigente = true
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (vigente) setEsAdmin({ userId, ok: Boolean(data) })
      })
    return () => {
      vigente = false
    }
  }, [userId])

  if (session === undefined) return { tipo: 'cargando' }
  if (!session) return { tipo: 'anonimo' }
  const email = session.user.email ?? ''
  if (esAdmin?.userId !== session.user.id) return { tipo: 'cargando' }
  return esAdmin.ok ? { tipo: 'admin', email } : { tipo: 'sinPermiso', email }
}

export default function AdminApp() {
  const estado = useEstadoAdmin()
  const { pathname } = useLocation()

  if (estado.tipo === 'cargando')
    return (
      <Pantalla>
        <span className="inline-flex items-center gap-3 font-semibold text-bordo/70">
          <Spinner className="h-5 w-5 text-verde" />
          Cargando…
        </span>
      </Pantalla>
    )
  if (estado.tipo === 'anonimo') return <Login />
  if (estado.tipo === 'sinPermiso')
    return (
      <Pantalla>
        <p>
          La cuenta <strong>{estado.email}</strong> no es administradora.
        </p>
        <button type="button" onClick={() => supabase.auth.signOut()} className="btn-pill mt-4">
          Cerrar sesión
        </button>
      </Pantalla>
    )

  return (
    <div className="min-h-screen bg-crema-claro">
      <header className="sticky top-0 z-30 border-b border-linea bg-white/95 shadow-[0_2px_12px_rgba(71,14,18,0.04)] backdrop-blur">
        {/* Celular: marca y acciones arriba, menú abajo a todo el ancho. Desde sm: todo en una línea */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link to="/admin" className="text-lg font-black tracking-tight whitespace-nowrap">
            Uko · Admin
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm font-semibold sm:order-last">
            <Link to="/" className="text-verde hover:underline">
              Ver tienda
            </Link>
            <span className="hidden text-bordo/60 lg:inline">{estado.email}</span>
            <button type="button" onClick={() => supabase.auth.signOut()} className="text-bordo/70 transition-colors hover:text-bordo">
              Salir
            </button>
          </div>
          <nav className="grid w-full grid-cols-4 gap-1 rounded-full bg-crema-claro p-1 text-sm font-bold sm:flex sm:w-auto sm:bg-transparent sm:p-0">
            {SECCIONES.map((s) => {
              const activa = s.activa(pathname)
              return (
                <Link
                  key={s.to}
                  to={s.to}
                  aria-current={activa ? 'page' : undefined}
                  className={`rounded-full px-2 py-1.5 text-center whitespace-nowrap sm:px-3 transition-colors ${activa ? 'bg-verde-claro text-bordo' : 'text-bordo/70 hover:text-bordo'}`}
                >
                  {s.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>
      {/* La clave hace que cada pantalla entre con una animación suave al navegar */}
      <main key={pathname} className="fade-in mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route index element={<ListaProductos />} />
          <Route path="producto/nuevo" element={<EditarProducto />} />
          <Route path="producto/:id" element={<EditarProducto />} />
          <Route path="categorias" element={<ListaCategorias />} />
          <Route path="categorias/nueva" element={<EditarCategoria />} />
          <Route path="categorias/:id" element={<EditarCategoria />} />
          <Route path="precios" element={<ActualizarPrecios />} />
          <Route path="contacto" element={<Contacto />} />
          <Route path="*" element={<p>Página no encontrada.</p>} />
        </Routes>
      </main>
    </div>
  )
}

function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div>{children}</div>
    </div>
  )
}
