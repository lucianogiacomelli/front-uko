// Función serverless de Vercel que llama el cron diario (ver vercel.json).
// Evita que Supabase pause el proyecto del plan gratuito por inactividad (7 días sin actividad en la base):
// hace una consulta real y liviana, la fila de contacto por la API pública.
export async function GET(request: Request) {
  // Si está configurado CRON_SECRET en Vercel, solo responde a las llamadas del cron
  const secreto = process.env.CRON_SECRET
  if (secreto && request.headers.get('authorization') !== `Bearer ${secreto}`) {
    return new Response('No autorizado', { status: 401 })
  }

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return new Response('Faltan las variables de Supabase', { status: 500 })

  const r = await fetch(`${url}/rest/v1/contacto?select=id&limit=1`, { headers: { apikey: key } })
  // Un error queda registrado en los logs de la función en Vercel
  if (!r.ok) return new Response(`Supabase respondió ${r.status}`, { status: 502 })
  return new Response('Supabase activo')
}
