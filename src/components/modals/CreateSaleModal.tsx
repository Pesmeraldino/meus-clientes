'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Sale, Client, Product } from '@/types'

interface ItemRow {
  product_id: string
  quantity: string
  unit_price: string
}

interface Props {
  companyId: string
  onClose: () => void
  onCreated: (sales: Sale[]) => void
}

// ── Searchable product combobox ───────────────────────────────────────────────

interface ComboboxProps {
  products: Product[]
  value: string
  onChange: (productId: string, product: Product | null) => void
}

function ProductCombobox({ products, value, onChange }: ComboboxProps) {
  const selected = products.find(p => p.id === value) ?? null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : products

  // Close on outside click — restore display name if nothing new was chosen
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = useCallback((p: Product) => {
    setQuery('')
    setOpen(false)
    onChange(p.id, p)
  }, [onChange])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); setHighlighted(0) }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => {
        const next = Math.min(h + 1, Math.min(filtered.length, 100) - 1)
        // scroll highlighted item into view
        listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => {
        const next = Math.max(h - 1, 0)
        listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[highlighted]) handleSelect(filtered[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const displayValue = open ? query : (selected?.name ?? '')

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1 }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          className="input"
          value={displayValue}
          onChange={e => { setQuery(e.target.value); setHighlighted(0); if (!e.target.value) onChange('', null) }}
          onFocus={() => { setOpen(true); setHighlighted(0) }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar produto…"
          autoComplete="off"
          style={{ fontSize: 13, padding: '8px 10px', paddingRight: 28, width: '100%', boxSizing: 'border-box' }}
        />
        {/* Clear button when selected, chevron when empty */}
        {selected && !open ? (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); onChange('', null); setQuery(''); inputRef.current?.focus() }}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2, lineHeight: 1, fontSize: 12 }}
            tabIndex={-1}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg>
          </button>
        ) : (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}><path d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427z"/></svg>
        )}
      </div>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
            background: 'var(--bg-secondary)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
            maxHeight: 220, overflowY: 'auto',
          }}
          ref={listRef}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>
              Nenhum produto encontrado para "{query}"
            </div>
          ) : (
            filtered.slice(0, 100).map((p, i) => (
              <div
                key={p.id}
                onMouseDown={() => handleSelect(p)}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  background: i === highlighted ? 'var(--accent-subtle)' : 'transparent',
                  borderBottom: i < Math.min(filtered.length, 100) - 1 ? '1px solid var(--border-muted)' : 'none',
                }}
              >
                <span style={{ flex: 1, fontWeight: i === highlighted ? 500 : 400, color: 'var(--text-primary)', lineHeight: 1.3 }}>{p.name}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12, flexShrink: 0 }}>
                  R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))
          )}
          {filtered.length > 100 && (
            <div style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: 12, borderTop: '1px solid var(--border-muted)', textAlign: 'center' }}>
              Mostrando 100 de {filtered.length} — continue digitando para refinar
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

const selectStyle: React.CSSProperties = {
  flex: 'unset', width: '100%', padding: '8px 10px',
  background: 'var(--bg-primary)', color: 'var(--text-primary)',
  border: '1px solid var(--border-default)', borderRadius: 'var(--radius)',
  fontSize: 13, fontFamily: 'inherit', outline: 'none', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='%238b949e'%3E%3Cpath d='M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
}

export function CreateSaleModal({ companyId, onClose, onCreated }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [clientId, setClientId] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<ItemRow[]>([{ product_id: '', quantity: '1', unit_price: '' }])
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

  function setItemField(i: number, field: keyof ItemRow, value: string) {
    setItems(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  function handleProductChange(i: number, pid: string, product: Product | null) {
    setItems(prev => prev.map((row, idx) =>
      idx === i ? { ...row, product_id: pid, unit_price: product ? String(product.price) : row.unit_price } : row
    ))
  }

  function addItem() {
    setItems(prev => [...prev, { product_id: '', quantity: '1', unit_price: '' }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  const grandTotal = items.reduce((sum, it) => {
    const v = Number(it.quantity) * Number(it.unit_price)
    return sum + (isNaN(v) ? 0 : v)
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) return setError('Selecione o cliente.')
    if (items.some(it => !it.product_id)) return setError('Selecione o produto em todos os itens.')
    if (items.some(it => !it.unit_price || Number(it.unit_price) < 0)) return setError('Informe o preço em todos os itens.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/companies/${companyId}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          sale_date: saleDate,
          notes: notes || null,
          items: items.map(it => ({
            product_id: it.product_id,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCreated(data.sales)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar venda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop animate-fade-in" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal animate-scale-in" style={{ maxWidth: 560 }}>
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
            {error && (
              <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>
            )}

            {/* Client + Date row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">Cliente *</label>
                <select style={selectStyle} value={clientId} onChange={e => setClientId(e.target.value)} required>
                  <option value="">Selecionar…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Data</label>
                <input className="input" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
              </div>
            </div>

            {/* Items */}
            <label className="label" style={{ marginBottom: 8 }}>Produtos *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px 100px 32px', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', paddingLeft: 2 }}>Produto</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', paddingLeft: 2 }}>Qtd</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', paddingLeft: 2 }}>Preço unit. (R$)</span>
                <span />
              </div>

              {items.map((it, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 72px 100px 32px', gap: 6, alignItems: 'center' }}>
                  <ProductCombobox
                    products={products}
                    value={it.product_id}
                    onChange={(pid, product) => handleProductChange(i, pid, product)}
                  />
                  <input
                    className="input" type="number" min="1" value={it.quantity}
                    onChange={e => setItemField(i, 'quantity', e.target.value)}
                    style={{ padding: '8px 8px', fontSize: 13 }} required
                  />
                  <input
                    className="input" type="number" min="0" step="0.01" value={it.unit_price}
                    onChange={e => setItemField(i, 'unit_price', e.target.value)}
                    placeholder="0,00" style={{ padding: '8px 8px', fontSize: 13 }} required
                  />
                  <button
                    type="button" onClick={() => removeItem(i)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '6px', opacity: items.length === 1 ? 0.3 : 1 }}
                    disabled={items.length === 1}
                    title="Remover item"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg>
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addItem} className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z"/></svg>
              Adicionar produto
            </button>

            {grandTotal > 0 && (
              <div style={{
                background: 'var(--accent-subtle)', border: '1px solid var(--accent)',
                borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, color: 'var(--accent-text)' }}>
                  Total da venda{items.length > 1 ? ` (${items.length} itens)` : ''}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-text)' }}>
                  R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

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
