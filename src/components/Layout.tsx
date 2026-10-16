import { Outlet } from 'react-router'
import Footer from './Footer'
import Header from './Header'

// Pages own their width: Home uses full-bleed bands, the rest wrap in <Container>.
export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
