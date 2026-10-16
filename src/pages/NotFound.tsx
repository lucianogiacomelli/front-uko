import { Link } from 'react-router'
import Container from '../components/Container'

export default function NotFound() {
  return (
    <Container>
      <section className="flex flex-col items-center gap-5 py-16 text-center">
        <h1 className="text-3xl font-black tracking-tight">Página no encontrada</h1>
        <Link to="/productos" className="btn-pill">
          Ir a productos <span aria-hidden>→</span>
        </Link>
      </section>
    </Container>
  )
}
