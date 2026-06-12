'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from './ThemeToggle'
import type { AuthUser } from '@/types'

interface NavbarProps {
  user: AuthUser | null
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-default)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
              <path d="M1.5 2.75A.75.75 0 0 1 2.25 2h11.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1-.75-.75V2.75zm1.5.75v9h10V3.5H3zm2.75 2.5a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zm4.5 0a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h3zm-4.5 3a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zm4.5 0a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h3z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>Meus Clientes</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent-subtle)', color: 'var(--accent-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'none' }} className="sm:inline">
                {user.name}
              </span>
              <button onClick={logout} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-secondary)' }}>
                Sair
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href="/login" className="btn btn-ghost btn-sm">Entrar</Link>
              <Link href="/cadastro" className="btn btn-primary btn-sm">Cadastrar</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
