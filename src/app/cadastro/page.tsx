'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function CadastroPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) return setError('A senha deve ter pelo menos 6 caracteres.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <div style={{ position: 'absolute', top: 16, right: 24 }}>
        <ThemeToggle />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="22" height="22" viewBox="0 0 16 16" fill="white">
                <path d="M1.5 2.75A.75.75 0 0 1 2.25 2h11.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1-.75-.75V2.75zm1.5.75v9h10V3.5H3zm2.75 2.5a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zm4.5 0a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h3zm-4.5 3a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zm4.5 0a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h3z"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Criar conta</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Comece a gerenciar seus clientes hoje</p>
          </div>

          <div className="surface-elevated" style={{ padding: 28 }}>
            {error && (
              <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 20, color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Nome completo</label>
                <input className="input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required autoFocus />
              </div>
              <div className="form-group">
                <label className="label">E-mail</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div className="form-group">
                <label className="label">Senha</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8, padding: '10px' }} disabled={loading}>
                {loading ? 'Criando conta…' : 'Criar conta'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            Já tem uma conta?{' '}
            <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
