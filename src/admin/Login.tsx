import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    // Si sale bien, onAuthStateChange cambia la pantalla
    if (error) setError('Email o contraseña incorrectos.')
    setEnviando(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl border border-linea bg-white p-6 shadow-card">
        <span className="kicker text-verde">Uko</span>
        <h1 className="mt-1 mb-5 text-2xl font-extrabold tracking-tight">Panel de administración</h1>
        <label className="mb-3 block text-sm font-semibold">
          Email
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="campo mt-1"
          />
        </label>
        <label className="mb-4 block text-sm font-semibold">
          Contraseña
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="campo mt-1"
          />
        </label>
        {error && (
          <p role="alert" className="mb-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={enviando} className="btn-pill w-full justify-center disabled:opacity-60">
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
