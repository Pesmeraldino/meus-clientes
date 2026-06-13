'use client'

import { useState, useRef, useCallback, useId } from 'react'
import type { Product } from '@/types'

type Step = 'upload' | 'analyzing' | 'review' | 'saving'

interface Row {
  _id: string
  name: string
  description: string
  price: string
  _error?: string
}

interface Props {
  companyId: string
  onClose: () => void
  onImported: (products: Product[]) => void
}

const ACCEPTED = '.pdf,.xlsx,.xls,.csv'
const ACCEPTED_LABELS = 'PDF, Excel (.xlsx / .xls) ou CSV'

function makeId() {
  return Math.random().toString(36).slice(2)
}

function fmtFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImportProductsModal({ companyId, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const uid = useId()

  // ── file handling ──────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    setSelectedFile(file)
    setError('')
    setStep('analyzing')

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch(`/api/companies/${companyId}/products/upload`, {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao analisar o arquivo.')

      const parsed: Array<{ name: string; description: string | null; price: number }> = data.products
      setRows(parsed.map(p => ({
        _id: makeId(),
        name: p.name,
        description: p.description ?? '',
        price: String(p.price),
      })))
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
      setStep('upload')
    }
  }, [companyId])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  // ── review table helpers ───────────────────────────────

  function updateRow(id: string, field: keyof Omit<Row, '_id' | '_error'>, value: string) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value, _error: undefined } : r))
  }

  function deleteRow(id: string) {
    setRows(prev => prev.filter(r => r._id !== id))
  }

  function addRow() {
    setRows(prev => [...prev, { _id: makeId(), name: '', description: '', price: '' }])
  }

  // ── save ──────────────────────────────────────────────

  async function handleSave() {
    // Validate rows
    let valid = true
    const validated = rows.map(r => {
      const nameOk = r.name.trim().length > 0
      const priceVal = parseFloat(r.price.replace(',', '.'))
      const priceOk = !isNaN(priceVal) && priceVal >= 0
      if (!nameOk || !priceOk) {
        valid = false
        return { ...r, _error: !nameOk ? 'Nome obrigatório' : 'Preço inválido' }
      }
      return r
    })
    if (!valid) { setRows(validated); return }

    setStep('saving')
    setSaveError('')
    try {
      const res = await fetch(`/api/companies/${companyId}/products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: rows.map(r => ({
            name: r.name.trim(),
            description: r.description.trim() || null,
            price: parseFloat(r.price.replace(',', '.')),
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar produtos.')
      onImported(data.products)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar.')
      setStep('review')
    }
  }

  // ── render ─────────────────────────────────────────────

  const validCount = rows.filter(r => r.name.trim()).length

  return (
    <div className="modal-backdrop animate-fade-in" onClick={e => { if (e.target === e.currentTarget && step !== 'saving') onClose() }}>
      <div className="modal animate-scale-in" style={{ maxWidth: 680, width: '95vw' }}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent-subtle)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25V1.75zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5H3.75zm6.75.062V4.25c0 .138.112.25.25.25h2.688a.252.252 0 0 0-.011-.013L10.513 1.573a.266.266 0 0 0-.013-.011z"/></svg>
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Importar produtos</h2>
            </div>
            {step !== 'saving' && (
              <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg>
              </button>
            )}
          </div>
        </div>

        <div className="modal-body" style={{ padding: step === 'review' ? '0' : undefined }}>

          {/* ── UPLOAD ── */}
          {(step === 'upload' || step === 'analyzing') && (
            <div>
              {error && (
                <div style={{ background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16, color: 'var(--danger)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>
                  {error}
                </div>
              )}

              <div
                role="button"
                tabIndex={0}
                onClick={() => step === 'upload' && inputRef.current?.click()}
                onKeyDown={e => e.key === 'Enter' && step === 'upload' && inputRef.current?.click()}
                onDrop={step === 'upload' ? handleDrop : undefined}
                onDragOver={e => { e.preventDefault(); if (step === 'upload') setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                style={{
                  border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '48px 32px',
                  textAlign: 'center',
                  cursor: step === 'analyzing' ? 'default' : 'pointer',
                  background: dragging ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {step === 'analyzing' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      border: '3px solid var(--accent-subtle)',
                      borderTopColor: 'var(--accent)',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Analisando com IA…</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {selectedFile?.name} · {fmtFileSize(selectedFile?.size ?? 0)}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Identificando produtos e preços</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-muted)' }}>
                      <svg width="22" height="22" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-secondary)' }}><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25V1.75zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5H3.75zm6.75.062V4.25c0 .138.112.25.25.25h2.688a.252.252 0 0 0-.011-.013L10.513 1.573a.266.266 0 0 0-.013-.011z"/></svg>
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                        Arraste o arquivo aqui ou clique para selecionar
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{ACCEPTED_LABELS} · Máx. 25 MB</p>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-placeholder)', maxWidth: 340 }}>
                      A IA vai ler o arquivo e identificar todos os produtos automaticamente. Você poderá revisar antes de salvar.
                    </p>
                  </div>
                )}
              </div>
              <input ref={inputRef} id={uid} type="file" accept={ACCEPTED} onChange={handleFileInput} style={{ display: 'none' }} />
            </div>
          )}

          {/* ── REVIEW ── */}
          {(step === 'review' || step === 'saving') && (
            <div>
              {/* Summary banner */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-muted)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="white"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {rows.length} produto{rows.length !== 1 ? 's' : ''} identificado{rows.length !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    · {selectedFile?.name}
                  </span>
                </div>
                <button
                  onClick={() => { setStep('upload'); setRows([]); setError('') }}
                  className="btn btn-ghost btn-sm"
                  disabled={step === 'saving'}
                  style={{ fontSize: 12 }}
                >
                  Trocar arquivo
                </button>
              </div>

              {saveError && (
                <div style={{ margin: '12px 20px 0', background: 'var(--danger-subtle)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--danger)', fontSize: 13 }}>
                  {saveError}
                </div>
              )}

              <p style={{ padding: '10px 20px 6px', fontSize: 12, color: 'var(--text-secondary)' }}>
                Revise os dados abaixo. Edite qualquer campo, remova linhas incorretas ou adicione produtos que faltaram.
              </p>

              {/* Table */}
              <div style={{ overflowX: 'auto', maxHeight: 380, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-muted)' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: '40%' }}>Nome *</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Descrição</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', width: 110 }}>Preço (R$) *</th>
                      <th style={{ width: 36 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row._id} style={{
                        borderBottom: '1px solid var(--border-muted)',
                        background: row._error ? 'var(--danger-subtle)' : idx % 2 === 0 ? 'transparent' : 'var(--bg-tertiary)',
                      }}>
                        <td style={{ padding: '4px 8px' }}>
                          <input
                            className="input"
                            value={row.name}
                            onChange={e => updateRow(row._id, 'name', e.target.value)}
                            placeholder="Nome do produto"
                            disabled={step === 'saving'}
                            style={{ padding: '5px 8px', fontSize: 13, border: row._error && !row.name.trim() ? '1px solid var(--danger)' : undefined }}
                          />
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <input
                            className="input"
                            value={row.description}
                            onChange={e => updateRow(row._id, 'description', e.target.value)}
                            placeholder="Opcional"
                            disabled={step === 'saving'}
                            style={{ padding: '5px 8px', fontSize: 13 }}
                          />
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.price}
                            onChange={e => updateRow(row._id, 'price', e.target.value)}
                            placeholder="0,00"
                            disabled={step === 'saving'}
                            style={{ padding: '5px 8px', fontSize: 13, textAlign: 'right', border: row._error && (isNaN(parseFloat(row.price)) || parseFloat(row.price) < 0) ? '1px solid var(--danger)' : undefined }}
                          />
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => deleteRow(row._id)}
                            disabled={step === 'saving'}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '4px', color: 'var(--danger)', opacity: 0.7 }}
                            title="Remover"
                          >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add row */}
              <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-muted)' }}>
                <button
                  type="button"
                  onClick={addRow}
                  disabled={step === 'saving'}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 12, gap: 4 }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z"/></svg>
                  Adicionar produto manualmente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {step === 'upload' || step === 'analyzing' ? (
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={step === 'analyzing'}>
              Cancelar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setStep('upload'); setRows([]); setSaveError('') }}
                className="btn btn-secondary"
                disabled={step === 'saving'}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary"
                disabled={step === 'saving' || validCount === 0}
              >
                {step === 'saving'
                  ? 'Salvando…'
                  : `Importar ${validCount} produto${validCount !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
