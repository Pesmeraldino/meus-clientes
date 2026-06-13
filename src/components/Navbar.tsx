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

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white" aria-hidden="true">
              <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5H12v-2h-2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V2.5a1 1 0 0 0-1-1H4.5a1 1 0 0 0-1 1V7H5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5H3V2.5zM3 10.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-.975-.78-.975.78a.25.25 0 0 1-.4-.2v-3.25z"/>
            </svg>
          </div>
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>Meus Clientes</span>
        </Link>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ThemeToggle />
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* User avatar with ring */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--accent-subtle)',
                color: 'var(--accent-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                boxShadow: '0 0 0 2px var(--bg-secondary), 0 0 0 3.5px var(--border-default)',
              }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'none' }} className="sm:inline">
                {user.name}
              </span>
              {/* Logout — icon only with accessible label */}
              <button
                onClick={logout}
                className="icon-btn"
                aria-label="Sair"
                title="Sair"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>
                  <polyline points="11,11 14,8 11,5"/>
                  <line x1="14" y1="8" x2="6" y2="8"/>
                </svg>
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
