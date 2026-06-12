'use client'

import { useState, useRef } from 'react'
import type { Company } from '@/types'

interface Props {
  onClose: () => void
  onCreated: (company: Company) => void
}

export function CreateCompanyModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImageUrl(data.url)
      setImagePreview(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar imagem')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Nome da empresa é obrigatório.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone || null, image_url: imageUrl || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCreated(data.company)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar empresa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop animate-fade-in" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal animate-scale-in">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Nova Empresa</h2>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="label">Nome da empresa *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Loja do João" required autoFocus />
            </div>

            <div className="form-group">
              <label className="label">Telefone</label>
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(48) 99999-9999" type="tel" />
            </div>

            <div className="form-group">
              <label className="label">Logo / Imagem</label>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-default)', borderRadius: 'var(--radius)',
                  padding: '20px', cursor: 'pointer', textAlign: 'center',
                  background: 'var(--bg-primary)', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ maxHeight: 80, margin: '0 auto', borderRadius: 4, display: 'block' }} />
                ) : (
                  <>
                    <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-placeholder)', margin: '0 auto 8px' }}>
                      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5v-9zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5zM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2v-3.25z"/>
                    </svg>
                    <p style={{ fontSize: 13, color: 'var(--text-placeholder)' }}>
                      {uploading ? 'Enviando…' : 'Clique para selecionar uma imagem'}
                    </p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading || uploading}>
              {loading ? 'Criando…' : 'Criar empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
