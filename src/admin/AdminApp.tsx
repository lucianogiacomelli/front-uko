import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router'
import { supabase } from '../lib/supabase'
import EditarCategoria from './EditarCategoria'
import EditarProducto from './EditarProducto'
import ListaCategorias from './ListaCategorias'
import ListaProductos from './ListaProductos'
import Login from './Login'
import ActualizarPrecios from './precios/ActualizarPrecios'

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

  if (estado.tipo === 'cargando') return <Pantalla>Cargando…</Pantalla>
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
      <header className="border-b border-linea bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-5">
            <Link to="/admin" className="text-lg font-black tracking-tight">
              Uko · Admin
            </Link>
            <nav className="flex gap-1 text-sm font-bold">
              {[
                ['/admin', 'Productos'],
                ['/admin/categorias', 'Categorías'],
                ['/admin/precios', 'Precios'],
              ].map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/admin'}
                  className={({ isActive }) => `rounded-full px-3 py-1.5 ${isActive ? 'bg-verde-claro' : 'text-bordo/70 hover:text-bordo'}`}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/" className="text-verde hover:underline">
              Ver tienda
            </Link>
            <span className="hidden text-bordo/60 sm:inline">{estado.email}</span>
            <button type="button" onClick={() => supabase.auth.signOut()} className="text-bordo/70 hover:text-bordo">
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route index element={<ListaProductos />} />
          <Route path="producto/nuevo" element={<EditarProducto />} />
          <Route path="producto/:id" element={<EditarProducto />} />
          <Route path="categorias" element={<ListaCategorias />} />
          <Route path="categorias/nueva" element={<EditarCategoria />} />
          <Route path="categorias/:id" element={<EditarCategoria />} />
          <Route path="precios" element={<ActualizarPrecios />} />
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
