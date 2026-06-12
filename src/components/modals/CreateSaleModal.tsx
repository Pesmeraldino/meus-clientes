'use client'

import { useState, useEffect } from 'react'
import type { Sale, Client, Product } from '@/types'

interface Props {
  companyId: string
  onClose: () => void
  onCreated: (sale: Sale) => void
}

export function CreateSaleModal({ companyId, onClose, onCreated }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clientId, setClientId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/companies/${companyId}/clients`).then(r => r.json()),
      fetch(`/api/companies/${companyId}/products`).then(r => r.json()),
    ]).then(([cd, pd]) => {
      setClients(cd.clients ?? [])
      setProducts(pd.products ?? [])
    })
  }, [companyId])

  function handleProductChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const pid = e.target.value
    setProductId(pid)
    const prod = products.find(p => p.id === pid)
    if (prod) setUnitPrice(String(prod.price))
  }

  const total = Number(quantity) * Number(unitPrice)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !productId) return setError('Selecione o cliente e o produto.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/companies/${companyId}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, product_id: productId, quantity: Number(quantity), unit_price: Number(unitPrice), sale_date: saleDate, notes: notes || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCreated(data.sale)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar venda')
    } finally {
      setLoading(false)
    }
  }

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    background: 'var(--bg-primary)', color: 'var(--text-primary)',
    border: '1px solid var(--border-default)', borderRadius: 'var(--radius)',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='%238b949e'%3E%3Cpath d='M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427z'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  }

  return (
    <div className="modal-backdrop animate-fade-in" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal animate-scale-in">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Nova Venda</h2>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg>
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">Cliente *</label>
                <select style={selectStyle} value={clientId} onChange={e => setClientId(e.target.value)} required>
                  <option value="">Selecionar…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Produto *</label>
                <select style={selectStyle} value={productId} onChange={handleProductChange} required>
                  <option value="">Selecionar…</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">Quantidade *</label>
                <input className="input" type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
              </div>
              <div>
                <label className="label">Preço unitário (R$) *</label>
                <input className="input" type="number" min="0" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0,00" required />
              </div>
            </div>

            {total > 0 && (
              <div style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--accent-text)' }}>Total da venda</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-text)' }}>
                  R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="label">Data</label>
              <input className="input" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="label">Observações</label>
              <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional…" rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Salvando…' : 'Registrar venda'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
