'use client'

import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { CreateClientModal } from '@/components/modals/CreateClientModal'
import { CreateProductModal } from '@/components/modals/CreateProductModal'
import { CreateSaleModal } from '@/components/modals/CreateSaleModal'
import { ImportProductsModal } from '@/components/modals/ImportProductsModal'
import type { Company, Client, Product, Sale, CompanyStats } from '@/types'
import { getCompanyColor } from '@/lib/companyColor'

interface Props {
  company: Company
  initialClients: Client[]
  initialProducts: Product[]
  initialStats: CompanyStats | null
}

type TabId = 'overview' | 'clients' | 'products' | 'sales'

function fmt(n: number) {
  return `R$ ${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtShort(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`
  return fmt(n)
}
function fmtMonth(m: string) {
  const [y, mo] = m.split('-')
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

const ChartTooltipStyle = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  fontSize: 12,
  boxShadow: 'var(--shadow-md)',
}

export function CompanyDetailPanel({ company, initialClients, initialProducts, initialStats }: Props) {
  const companyColor = getCompanyColor(company.id)
  const [tab, setTab] = useState<TabId>('overview')
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [sales, setSales] = useState<Sale[]>(initialStats?.recent_sales ?? [])
  const [stats] = useState<CompanyStats | null>(initialStats)
  const [clientSearch, setClientSearch] = useState('')

  const [showAddClient, setShowAddClient] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddSale, setShowAddSale] = useState(false)
  const [showImportProducts, setShowImportProducts] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  function handleNewClient(c: Client) { setClients(p => [c, ...p]); setShowAddClient(false) }
  function handleNewProduct(p: Product) { setProducts(prev => [...prev, p].sort((a, b) => a.name.localeCompare(b.name))); setShowAddProduct(false) }
  function handleNewSale(newSales: Sale[]) { setSales(p => [...newSales, ...p]); setShowAddSale(false) }
  function handleImported(imported: Product[]) {
    setProducts(prev => [...prev, ...imported].sort((a, b) => a.name.localeCompare(b.name)))
    setShowImportProducts(false)
  }

  const filteredClients = clientSearch.trim()
    ? clients.filter(c =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(clientSearch.toLowerCase()) ||
        (c.phone ?? '').includes(clientSearch)
      )
    : clients

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: 'Visão geral' },
    { id: 'clients',  label: 'Clientes',  count: clients.length },
    { id: 'products', label: 'Produtos',  count: products.length },
    { id: 'sales',    label: 'Vendas',    count: sales.length },
  ]

  return (
    <>
      {/* Scrollable content — sits below the fixed top overlay (72px) */}
      <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '72px 24px 24px' }}>

        {/* Company header */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          {company.image_url ? (
            <img src={company.image_url} alt={company.name} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: companyColor + '22', color: companyColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, border: `1px solid ${companyColor}40` }}>
              {company.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{company.name}</h2>
            {company.phone && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{company.phone}</p>}
          </div>
        </div>

        {/* Stat cards */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Receita total', value: fmtShort(stats.total_revenue) },
              { label: 'Vendas',        value: String(stats.total_sales)     },
              { label: 'Clientes',      value: String(stats.total_clients)   },
              { label: 'Produtos',      value: String(stats.total_products)  },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ borderLeft: `3px solid ${companyColor}` }}>
                <div className="stat-value" style={{ color: companyColor }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          {tabs.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
              {t.count !== undefined && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 100, marginLeft: 4,
                  background: tab === t.id ? companyColor + '22' : 'var(--bg-tertiary)',
                  color: tab === t.id ? companyColor : 'var(--text-secondary)',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gap: 20 }}>

            {stats && stats.monthly_revenue.length > 0 && (
              <div className="surface" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Receita mensal — últimos 12 meses</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.monthly_revenue.map(r => ({ ...r, revenue: Number(r.revenue), month: fmtMonth(r.month) }))}>
                    <defs>
                      <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={companyColor} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={companyColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v).replace('R$ ', '')} />
                    <Tooltip contentStyle={ChartTooltipStyle} formatter={(v) => [fmt(Number(v)), 'Receita']} />
                    <Area type="monotone" dataKey="revenue" stroke={companyColor} strokeWidth={2} fill="url(#panelGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {stats && stats.top_clients.length > 0 && (
              <div className="surface" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Top clientes por receita</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.top_clients.map(c => ({ ...c, total: Number(c.total) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v).replace('R$ ', '')} />
                    <Tooltip contentStyle={ChartTooltipStyle} formatter={(v) => [fmt(Number(v)), 'Total']} />
                    <Bar dataKey="total" fill={companyColor} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {sales.length > 0 && (
              <div className="surface">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Vendas recentes</h3>
                  <button onClick={() => setTab('sales')} className="btn btn-ghost btn-sm">Ver todas</button>
                </div>
                <div className="table-container">
                  <table>
                    <thead><tr><th>Cliente</th><th>Produto</th><th>Qtd</th><th>Total</th><th>Data</th></tr></thead>
                    <tbody>
                      {sales.slice(0, 5).map(s => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 500 }}>{s.client_name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{s.product_name}</td>
                          <td>{s.quantity}</td>
                          <td style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(s.total_price)}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{new Date(s.sale_date).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CLIENTS ── */}
        {tab === 'clients' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Clientes</h2>
              <button onClick={() => setShowAddClient(true)} className="btn btn-primary btn-sm">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z"/></svg>
                Novo cliente
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/>
              </svg>
              <input className="input" type="search" placeholder="Pesquisar por nome, e-mail ou telefone…" value={clientSearch} onChange={e => setClientSearch(e.target.value)} style={{ paddingLeft: 32 }} />
            </div>
            {clients.length === 0 ? (
              <div className="surface">
                <div className="empty-state">
                  <div className="empty-state-icon"><svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664h10z"/></svg></div>
                  <p className="empty-state-title">Nenhum cliente ainda</p>
                  <p className="empty-state-desc">Adicione clientes para começar a registrar vendas.</p>
                  <button onClick={() => setShowAddClient(true)} className="btn btn-primary">Adicionar primeiro cliente</button>
                </div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="surface" style={{ padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Nenhum cliente encontrado para <strong style={{ color: 'var(--text-primary)' }}>"{clientSearch}"</strong>
                </p>
              </div>
            ) : (
              <div className="surface">
                <div className="table-container">
                  <table>
                    <thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Total comprado</th><th>Desde</th></tr></thead>
                    <tbody>
                      {filteredClients.map(c => (
                        <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedClient(selectedClient?.id === c.id ? null : c)}>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{c.email ?? '—'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{c.phone ?? '—'}</td>
                          <td style={{ fontWeight: 600, color: Number(c.total_sales) > 0 ? 'var(--success)' : 'var(--text-secondary)' }}>
                            {Number(c.total_sales) > 0 ? fmt(Number(c.total_sales)) : '—'}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {clientSearch && (
                  <p style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-muted)' }}>
                    {filteredClients.length} de {clients.length} cliente{clients.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {tab === 'products' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Produtos</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowImportProducts(true)} className="btn btn-secondary btn-sm">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14H2.75zM7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969z"/></svg>
                  Importar produtos
                </button>
                <button onClick={() => setShowAddProduct(true)} className="btn btn-primary btn-sm">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z"/></svg>
                  Novo produto
                </button>
              </div>
            </div>
            {products.length === 0 ? (
              <div className="surface">
                <div className="empty-state">
                  <div className="empty-state-icon"><svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor"><path d="M8.878.392a1.75 1.75 0 0 0-1.756 0l-5.25 3.045A1.75 1.75 0 0 0 1 4.951v6.098c0 .624.332 1.2.872 1.514l5.25 3.045a1.75 1.75 0 0 0 1.756 0l5.25-3.045c.54-.313.872-.89.872-1.514V4.951c0-.624-.332-1.2-.872-1.514L8.878.392z"/></svg></div>
                  <p className="empty-state-title">Nenhum produto ainda</p>
                  <p className="empty-state-desc">Cadastre produtos para poder registrar vendas.</p>
                  <button onClick={() => setShowAddProduct(true)} className="btn btn-primary">Adicionar primeiro produto</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {products.map(p => (
                  <div key={p.id} className="surface" style={{ padding: '16px 18px' }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>{p.name}</p>
                    {p.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>{p.description}</p>}
                    <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>{fmt(p.price)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SALES ── */}
        {tab === 'sales' && (
          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Vendas registradas</h2>
              <button onClick={() => setShowAddSale(true)} className="btn btn-primary btn-sm" disabled={clients.length === 0 || products.length === 0}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z"/></svg>
                Nova venda
              </button>
            </div>
            {(clients.length === 0 || products.length === 0) && (
              <div style={{ background: 'var(--warning-subtle)', border: '1px solid var(--warning)', borderRadius: 'var(--radius)', padding: '12px 16px', fontSize: 13, color: 'var(--warning)' }}>
                {clients.length === 0 && products.length === 0
                  ? 'Cadastre clientes e produtos antes de registrar vendas.'
                  : clients.length === 0
                  ? 'Cadastre ao menos um cliente antes de registrar vendas.'
                  : 'Cadastre ao menos um produto antes de registrar vendas.'}
              </div>
            )}
            {sales.length === 0 ? (
              <div className="surface">
                <div className="empty-state">
                  <div className="empty-state-icon"><svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 1.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25H1.75zM0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25V1.75zm9.22 3.72a.75.75 0 0 1 1.06 0l2 2a.75.75 0 0 1 0 1.06l-2 2a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l.72-.72H5.75a.75.75 0 0 1 0-1.5h4.19l-.72-.72a.75.75 0 0 1 0-1.06z"/></svg></div>
                  <p className="empty-state-title">Nenhuma venda ainda</p>
                  <p className="empty-state-desc">Registre a primeira venda para começar a acompanhar o desempenho.</p>
                  {clients.length > 0 && products.length > 0 && (
                    <button onClick={() => setShowAddSale(true)} className="btn btn-primary">Registrar primeira venda</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="surface">
                <div className="table-container">
                  <table>
                    <thead><tr><th>Data</th><th>Cliente</th><th>Produto</th><th>Qtd</th><th>Preço unit.</th><th>Total</th></tr></thead>
                    <tbody>
                      {sales.map(s => (
                        <tr key={s.id}>
                          <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(s.sale_date).toLocaleDateString('pt-BR')}</td>
                          <td style={{ fontWeight: 500 }}>{s.client_name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{s.product_name}</td>
                          <td>{s.quantity}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{fmt(s.unit_price)}</td>
                          <td style={{ fontWeight: 700, color: 'var(--success)' }}>{fmt(s.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddClient    && <CreateClientModal   companyId={company.id} onClose={() => setShowAddClient(false)}    onCreated={handleNewClient}  />}
      {showAddProduct   && <CreateProductModal  companyId={company.id} onClose={() => setShowAddProduct(false)}   onCreated={handleNewProduct} />}
      {showAddSale      && <CreateSaleModal     companyId={company.id} onClose={() => setShowAddSale(false)}      onCreated={handleNewSale}    />}
      {showImportProducts && <ImportProductsModal companyId={company.id} onClose={() => setShowImportProducts(false)} onImported={handleImported} />}

      {selectedClient && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', boxShadow: 'var(--shadow-lg)', zIndex: 30, minWidth: 220 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{selectedClient.name}</p>
              {selectedClient.email && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedClient.email}</p>}
              {selectedClient.phone && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedClient.phone}</p>}
            </div>
            <button onClick={() => setSelectedClient(null)} className="btn btn-ghost btn-sm" style={{ padding: 2 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg>
            </button>
          </div>
          {Number(selectedClient.total_sales) > 0 && (
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>Total: {fmt(Number(selectedClient.total_sales))}</p>
          )}
        </div>
      )}
    </>
  )
}
