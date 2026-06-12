'use client'

import { useState } from 'react'
import type { Client } from '@/types'

interface Props {
  companyId: string
  onClose: () => void
  onCreated: (client: Client) => void
}

export function CreateClientModal({ companyId, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Nome do cliente é obrigatório.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/companies/${companyId}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email || null, phone: phone || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCreated(data.client)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop animate-fade-in" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal animate-scale-in">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Novo Cliente</h2>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg>
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
            <div className="form-group">
              <label className="label">Nome *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" required autoFocus />
            </div>
            <div className="form-group">
              <label className="label">E-mail</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" />
            </div>
            <div className="form-group">
              <label className="label">Telefone</label>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(48) 99999-9999" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando…' : 'Adicionar cliente'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
