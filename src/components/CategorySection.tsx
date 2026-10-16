import type { CSSProperties } from 'react'
import { useInView } from '../hooks/useInView'
import type { Product } from '../types/product'
import { LeafIcon } from './Icons'
import ProductCard from './ProductCard'

type Props = { id: string; title: string; products: Product[] }

// Una categoría: encabezado + grilla de productos que aparecen en cascada al entrar en pantalla
export default function CategorySection({ id, title, products }: Props) {
  const { ref, inView } = useInView<HTMLElement>()

  return (
    <section ref={ref} id={id} data-cat-section className="mb-14 scroll-mt-44">
      <header className={`reveal mb-5 flex items-center gap-3 ${inView ? 'in' : ''}`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-verde-claro text-verde">
          <LeafIcon className="h-5 w-5" />
        </span>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h2>
        <span className="rounded-full bg-verde-claro px-3 py-1 text-xs font-extrabold text-verde">{products.length}</span>
        <span className="ml-2 hidden h-px flex-1 bg-linea sm:block" aria-hidden />
      </header>

      <div className={`reveal-group grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 ${inView ? 'in' : ''}`}>
        {products.map((p, i) => (
          <div key={p.id} className="reveal-item" style={{ '--i': Math.min(i, 10) } as CSSProperties}>
            <ProductCard product={p} showCategory={false} />
          </div>
        ))}
      </div>
    </section>
  )
}
