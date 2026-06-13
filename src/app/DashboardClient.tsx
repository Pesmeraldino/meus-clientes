'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { FloatingCompaniesCanvas } from '@/components/FloatingCompaniesCanvas'
import { CompanyDetailPanel } from '@/components/CompanyDetailPanel'
import { ThemeToggle } from '@/components/ThemeToggle'
import { CreateCompanyModal } from '@/components/modals/CreateCompanyModal'
import type { Company, CompanyWithStats, AuthUser, Client, Product, CompanyStats } from '@/types'
import {
  getCompanyColor, setCompanyColor, clearCompanyColor,
  getDefaultCompanyColor, loadColorOverrides, hslToHex, hexToHue,
} from '@/lib/companyColor'

type FilterMode = 'revenue' | 'recency'
type ViewMode = 'canvas' | 'cards' | 'charts'

interface CompanyDetail {
  company: Company
  clients: Client[]
  products: Product[]
  stats: CompanyStats | null
}

interface Props {
  user: AuthUser
  initialCompanies: CompanyWithStats[]
}

const HEAT_COLORS = { hot: '#3fb950', warm: '#d29922', cold: '#8b949e' }
const HEAT_LABELS  = { hot: 'Quente', warm: 'Morno', cold: 'Frio' }

function fmt(n: number) {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `R$ ${(n / 1_000).toFixed(1)}k`
  return `R$ ${Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

const TooltipStyle = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconBubbles() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="11" r="3"/>
      <circle cx="11.5" cy="5" r="3.5" opacity="0.75"/>
      <circle cx="12" cy="13" r="2" opacity="0.5"/>
    </svg>
  )
}

function IconGrid() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1"/>
      <rect x="9" y="1" width="6" height="6" rx="1"/>
      <rect x="1" y="9" width="6" height="6" rx="1"/>
      <rect x="9" y="9" width="6" height="6" rx="1"/>
    </svg>
  )
}

function IconChartBars() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1"  y="9"  width="3" height="6" rx="0.5"/>
      <rect x="6"  y="5"  width="3" height="10" rx="0.5"/>
      <rect x="11" y="1"  width="3" height="14" rx="0.5"/>
    </svg>
  )
}

function IconPlus({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z"/>
    </svg>
  )
}

function IconFlame() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
    </svg>
  )
}

function HeatBadge({ heat }: { heat: 'hot' | 'warm' | 'cold' }) {
  if (heat === 'hot') return (
    <span className="badge-hot">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
      </svg>
      {HEAT_LABELS.hot}
    </span>
  )
  if (heat === 'warm') return (
    <span className="badge-warm">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="4"/>
        <line x1="12" y1="2"  x2="12" y2="4"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="12" y1="20" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="2"  y1="12" x2="4"  y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="20" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="4.93" y1="4.93"   x2="6.34"  y2="6.34"   stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="17.66" y1="17.66" x2="19.07" y2="19.07"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="4.93" y1="19.07"  x2="6.34"  y2="17.66"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="17.66" y1="6.34"  x2="19.07" y2="4.93"   stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      {HEAT_LABELS.warm}
    </span>
  )
  return (
    <span className="badge-cold">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" y1="2" x2="12" y2="22"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        <line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/>
        <polyline points="8,2 12,6 16,2"/>
        <polyline points="8,22 12,18 16,22"/>
        <polyline points="2,8 6,12 2,16"/>
        <polyline points="22,8 18,12 22,16"/>
      </svg>
      {HEAT_LABELS.cold}
    </span>
  )
}

// ── View definitions ───────────────────────────────────────────────────────────

const VIEWS = [
  { id: 'canvas' as ViewMode, label: 'Visão',    icon: <IconBubbles />   },
  { id: 'cards'  as ViewMode, label: 'Empresas', icon: <IconGrid />      },
  { id: 'charts' as ViewMode, label: 'Gráficos', icon: <IconChartBars />},
]

// ── Main component ─────────────────────────────────────────────────────────────

export function DashboardClient({ user, initialCompanies }: Props) {
  const [currentUser, setCurrentUser] = useState(user)
  const [companies, setCompanies] = useState<CompanyWithStats[]>(initialCompanies)
  const [showCreate, setShowCreate] = useState(false)
  const [mode,  setMode]  = useState<FilterMode>('revenue')
  const [view,  setView]  = useState<ViewMode>('canvas')
  const [profileOpen, setProfileOpen] = useState(false)
  const router = useRouter()

  // ── SPA company detail state ───────────────────────────────────────────────
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [companyDetail, setCompanyDetail] = useState<CompanyDetail | null>(null)
  const [companyLoading, setCompanyLoading] = useState(false)

  // ── Color overrides ────────────────────────────────────────────────────────
  const [colorVersion, setColorVersion] = useState(0)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  useEffect(() => { loadColorOverrides(); setColorVersion(v => v + 1) }, [])

  useEffect(() => {
    if (!selectedCompanyId) {
      setCompanyDetail(null)
      setColorPickerOpen(false)
      return
    }
    setCompanyLoading(true)
    setCompanyDetail(null)
    fetch(`/api/companies/${selectedCompanyId}/data`)
      .then(r => r.json())
      .then(data => {
        setCompanyDetail({
          company: data.company,
          clients: data.clients,
          products: data.products,
          stats: data.stats,
        })
      })
      .catch(() => setSelectedCompanyId(null))
      .finally(() => setCompanyLoading(false))
  }, [selectedCompanyId])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function handleCreated(company: Company) {
    const withStats: CompanyWithStats = {
      ...company, total_revenue: 0, total_sales: 0, last_sale_date: null, heat: 'cold',
    }
    setCompanies(prev => [withStats, ...prev])
    setShowCreate(false)
  }

  // Chart data
  const revenueData = [...companies]
    .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
    .map(c => ({ id: c.id, name: c.name.length > 15 ? c.name.slice(0, 14) + '…' : c.name, value: Number(c.total_revenue) }))

  const salesData = [...companies]
    .sort((a, b) => b.total_sales - a.total_sales)
    .map(c => ({ id: c.id, name: c.name.length > 15 ? c.name.slice(0, 14) + '…' : c.name, value: c.total_sales }))

  const heatCount = {
    hot:  companies.filter(c => c.heat === 'hot').length,
    warm: companies.filter(c => c.heat === 'warm').length,
    cold: companies.filter(c => c.heat === 'cold').length,
  }

  // Header style: solid when in company detail view or non-canvas views
  const solidHeader = !!selectedCompanyId || view !== 'canvas'

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', padding: 16, background: 'var(--bg-primary)', boxSizing: 'border-box' }}>
      <div style={{
        position: 'relative',
        height: '100%',
        border: '2px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        background: 'var(--bg-secondary)',
      }}>

        {/* ── Main content ──────────────────────────────────────────── */}

        {/* Company detail panel */}
        {selectedCompanyId && companyLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--border-default)', borderTopColor: 'var(--accent)', animation: 'spin 0.7s linear infinite' }} />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Carregando…</p>
            </div>
          </div>
        )}

        {selectedCompanyId && companyDetail && (
          <CompanyDetailPanel
            company={companyDetail.company}
            initialClients={companyDetail.clients}
            initialProducts={companyDetail.products}
            initialStats={companyDetail.stats}
          />
        )}

        {/* Dashboard views — hidden when company is selected */}
        {!selectedCompanyId && (
          <>
            {/* Canvas view */}
            {view === 'canvas' && companies.length > 0 && (
              <FloatingCompaniesCanvas
                companies={companies}
                mode={mode}
                insetTop={56}
                insetBottom={56}
                onSelect={setSelectedCompanyId}
              />
            )}

            {/* Canvas empty state */}
            {view === 'canvas' && companies.length === 0 && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 16, padding: 24,
              }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-placeholder)' }} aria-hidden="true">
                    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5H12v-2h-2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V2.5a1 1 0 0 0-1-1H4.5a1 1 0 0 0-1 1V7H5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5H3V2.5zM3 10.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-.975-.78-.975.78a.25.25 0 0 1-.4-.2v-3.25z"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Nenhuma empresa cadastrada</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 300 }}>Adicione sua primeira empresa para começar.</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ gap: 6 }}>
                  <IconPlus size={14} /> Nova empresa
                </button>
              </div>
            )}

            {/* Cards view */}
            {view === 'cards' && (
              <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '68px 20px 20px' }}>
                {companies.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', gap: 16 }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Nenhuma empresa cadastrada ainda.</p>
                    <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ gap: 6 }}>
                      <IconPlus size={14} /> Nova empresa
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {companies.map(c => <CompanyCard key={c.id} company={c} onSelect={setSelectedCompanyId} />)}
                    <button
                      onClick={() => setShowCreate(true)}
                      style={{
                        border: '2px dashed var(--border-default)', borderRadius: 'var(--radius-lg)',
                        background: 'transparent', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 8, color: 'var(--text-placeholder)', transition: 'all 0.15s ease', minHeight: 130,
                        padding: '24px 16px',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-placeholder)' }}
                    >
                      <IconPlus size={20} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Nova empresa</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Charts view */}
            {view === 'charts' && (
              <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '68px 24px 24px' }}>
                {companies.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Nenhum dado disponível ainda.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      {(['hot', 'warm', 'cold'] as const).map(h => (
                        <div key={h} className="stat-card" style={{ borderLeft: `3px solid ${HEAT_COLORS[h]}` }}>
                          <p style={{ fontSize: 28, fontWeight: 700, color: HEAT_COLORS[h], lineHeight: 1.1 }}>{heatCount[h]}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {h === 'hot' ? '🔥' : h === 'warm' ? '☀' : '❄'} {HEAT_LABELS[h]}
                            {h === 'hot'  && <span style={{ display: 'block', fontSize: 11, marginTop: 2 }}>Venda no último mês</span>}
                            {h === 'warm' && <span style={{ display: 'block', fontSize: 11, marginTop: 2 }}>2–3 meses</span>}
                            {h === 'cold' && <span style={{ display: 'block', fontSize: 11, marginTop: 2 }}>Sem vendas recentes</span>}
                          </p>
                        </div>
                      ))}
                    </div>

                    {revenueData.length >= 1 && (
                      <div className="surface" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Receita total por empresa</h3>
                        <ResponsiveContainer width="100%" height={Math.max(160, revenueData.length * 36)}>
                          <BarChart data={revenueData} layout="vertical" margin={{ left: 0, right: 32, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false}
                              tickFormatter={v => fmt(v).replace('R$ ', '')} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-primary)' }} axisLine={false} tickLine={false} width={130} />
                            <Tooltip contentStyle={TooltipStyle} formatter={(v) => [fmt(Number(v)), 'Receita']} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                              {revenueData.map((entry, i) => (
                                <Cell key={i} fill={getCompanyColor(entry.id)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {salesData.length >= 1 && (
                      <div className="surface" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>Total de vendas por empresa</h3>
                        <ResponsiveContainer width="100%" height={Math.max(160, salesData.length * 36)}>
                          <BarChart data={salesData} layout="vertical" margin={{ left: 0, right: 32, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-primary)' }} axisLine={false} tickLine={false} width={130} />
                            <Tooltip contentStyle={TooltipStyle} formatter={(v) => [v, 'Vendas']} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                              {salesData.map((entry, i) => (
                                <Cell key={i} fill={getCompanyColor(entry.id)} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
                          {salesData.map(entry => (
                            <span key={entry.id} style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span className="heat-dot" style={{ background: getCompanyColor(entry.id) }} />
                              {entry.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Top overlay ───────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12,
          background: solidHeader
            ? 'var(--bg-secondary)'
            : 'linear-gradient(to bottom, var(--bg-secondary) 30%, transparent 100%)',
          borderBottom: solidHeader ? '1px solid var(--border-muted)' : 'none',
          pointerEvents: 'none',
          zIndex: 10,
        }}>

          {/* Left — logo/back */}
          {selectedCompanyId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto', flexShrink: 0, position: 'relative' }}>
              <button
                onClick={() => setSelectedCompanyId(null)}
                className="icon-btn"
                aria-label="Voltar"
                title="Voltar para empresas"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.56 7.25h8.69a.75.75 0 0 1 0 1.5H4.56l3.22 3.22a.75.75 0 0 1 0 1.06z"/>
                </svg>
              </button>
              {companyDetail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <button
                    onClick={() => setColorPickerOpen(o => !o)}
                    title="Trocar cor da empresa"
                    style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: getCompanyColor(companyDetail.company.id),
                      border: '2px solid var(--bg-secondary)',
                      outline: `2px solid ${getCompanyColor(companyDetail.company.id)}`,
                      cursor: 'pointer', flexShrink: 0, padding: 0,
                      transition: 'transform 0.15s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.3)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{companyDetail.company.name}</span>
                </div>
              )}

              {/* Color wheel popover */}
              {colorPickerOpen && companyDetail && (
                <ColorWheelPicker
                  companyId={companyDetail.company.id}
                  currentColor={getCompanyColor(companyDetail.company.id)}
                  onChange={color => {
                    setCompanyColor(companyDetail.company.id, color)
                    setColorVersion(v => v + 1)
                  }}
                  onReset={() => {
                    clearCompanyColor(companyDetail.company.id)
                    setColorVersion(v => v + 1)
                  }}
                  onClose={() => setColorPickerOpen(false)}
                />
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, pointerEvents: 'auto', flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)', flexShrink: 0,
              }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="white" aria-hidden="true">
                  <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5H12v-2h-2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V2.5a1 1 0 0 0-1-1H4.5a1 1 0 0 0-1 1V7H5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5H3V2.5zM3 10.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-.975-.78-.975.78a.25.25 0 0 1-.4-.2v-3.25z"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{currentUser.name}</span>
            </div>
          )}

          {/* Center — view switcher (hidden in company detail) */}
          {!selectedCompanyId && (
            <div style={{
              display: 'flex', pointerEvents: 'auto',
              background: 'var(--bg-tertiary)',
              borderRadius: 10, padding: 3, gap: 2,
            }}>
              {VIEWS.map(v => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  aria-pressed={view === v.id}
                  title={v.label}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 7,
                    fontSize: 12, fontWeight: 500,
                    background: view === v.id ? 'var(--bg-secondary)' : 'transparent',
                    color: view === v.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: view === v.id ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.15s ease',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {v.icon}
                  {v.label}
                </button>
              ))}
            </div>
          )}

          {/* Right — actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'auto', flexShrink: 0, position: 'relative' }}>
            <ThemeToggle />
            {/* Separator */}
            <div style={{ width: 1, height: 16, background: 'var(--border-muted)', margin: '0 2px', flexShrink: 0 }} />
            {!selectedCompanyId && (
              <button onClick={() => setShowCreate(true)} className="icon-btn" aria-label="Nova empresa" title="Nova empresa">
                <IconPlus />
              </button>
            )}
            {/* Profile avatar — clickable */}
            <button
              onClick={() => setProfileOpen(o => !o)}
              title="Editar perfil"
              aria-label="Editar perfil"
              style={{
                width: 28, height: 28, borderRadius: '50%', padding: 0, border: 'none',
                background: 'var(--accent-subtle)', color: 'var(--accent-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, userSelect: 'none', cursor: 'pointer', overflow: 'hidden',
                boxShadow: profileOpen
                  ? `0 0 0 2px var(--bg-secondary), 0 0 0 3.5px var(--accent)`
                  : `0 0 0 2px var(--bg-secondary), 0 0 0 3.5px var(--border-default)`,
                transition: 'box-shadow 0.15s ease',
              }}
            >
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                currentUser.name.charAt(0).toUpperCase()
              )}
            </button>
            <button onClick={logout} className="icon-btn" aria-label="Sair" title="Sair" style={{ color: 'var(--text-secondary)' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>
                <polyline points="11,11 14,8 11,5"/>
                <line x1="14" y1="8" x2="6" y2="8"/>
              </svg>
            </button>

            {/* Profile popover */}
            {profileOpen && (
              <ProfilePopover
                user={currentUser}
                onSaved={updated => { setCurrentUser(updated); setProfileOpen(false) }}
                onClose={() => setProfileOpen(false)}
              />
            )}
          </div>
        </div>

        {/* ── Bottom overlay — canvas only, no company selected ─────── */}
        {!selectedCompanyId && view === 'canvas' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(to top, var(--bg-secondary) 30%, transparent 100%)',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setMode('revenue')}
                className={`btn btn-sm ${mode === 'revenue' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ gap: 5 }}
                aria-pressed={mode === 'revenue'}
                title="Tamanho por receita total"
              >
                <IconChartBars />
                Receita
              </button>
              <button
                onClick={() => setMode('recency')}
                className={`btn btn-sm ${mode === 'recency' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ gap: 5 }}
                aria-pressed={mode === 'recency'}
                title="Maior = mais tempo sem vender"
              >
                <IconFlame />
                Recência
              </button>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {mode === 'revenue'
                ? 'maior = mais receita'
                : 'maior = mais tempo sem vender · menor = venda recente'}
              {' · clique para abrir'}
            </span>
          </div>
        )}

      </div>

      {showCreate && (
        <CreateCompanyModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
    </div>
  )
}

// ── ProfilePopover ────────────────────────────────────────────────────────────

function ProfilePopover({
  user,
  onSaved,
  onClose,
}: {
  user: AuthUser
  onSaved: (updated: AuthUser) => void
  onClose: () => void
}) {
  const [name, setName] = useState(user.name)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) setAvatarUrl(data.url)
      else setError(data.error ?? 'Erro no upload.')
    } catch {
      setError('Erro ao enviar imagem.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatar_url: avatarUrl }),
      })
      const data = await res.json()
      if (data.user) onSaved(data.user)
      else setError(data.error ?? 'Erro ao salvar.')
    } catch {
      setError('Erro de conexão.')
    } finally {
      setSaving(false)
    }
  }

  const initial = (name || user.name).charAt(0).toUpperCase()

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 18 }} />
      <div
        className="animate-scale-in"
        style={{
          position: 'absolute',
          top: 40, right: 0,
          width: 264,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lg)',
          padding: 20,
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Avatar upload area */}
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%', overflow: 'hidden', position: 'relative',
            background: 'var(--accent-subtle)', color: 'var(--accent-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700,
            border: '2px solid var(--border-default)',
            transition: 'border-color 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={initial} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : initial}
            {/* Hover overlay */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.45)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
            >
              {uploading ? (
                <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid transparent', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 16 16" fill="white" style={{ opacity: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                >
                  <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l.686.686a1.75 1.75 0 0 1 0 2.474l-9.56 9.56A1.751 1.751 0 0 1 3.373 14.5H2a.75.75 0 0 1-.75-.75v-1.373a1.75 1.75 0 0 1 .513-1.239z"/>
                </svg>
              )}
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {uploading ? 'Enviando…' : 'Trocar foto'}
          </span>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />
        </label>

        {/* Name field */}
        <div>
          <label className="label">Nome</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Seu nome"
            autoFocus
          />
        </div>

        {/* Email — read-only info */}
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: -8 }}>
          {user.email}
        </p>

        {error && <p style={{ fontSize: 12, color: 'var(--danger)', textAlign: 'center', marginTop: -8 }}>{error}</p>}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary btn-sm"
            disabled={saving || uploading || !name.trim()}
            style={{ flex: 1 }}
          >
            {saving ? '…' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── ColorWheelPicker ──────────────────────────────────────────────────────────

const WHEEL_GRADIENT = (() => {
  const stops = Array.from({ length: 13 }, (_, i) => `hsl(${i * 30}deg,62%,58%)`).join(',')
  return `conic-gradient(${stops})`
})()

function ColorWheelPicker({
  companyId,
  currentColor,
  onChange,
  onReset,
  onClose,
}: {
  companyId: string
  currentColor: string
  onChange: (color: string) => void
  onReset: () => void
  onClose: () => void
}) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const hue = hexToHue(currentColor)
  const defaultColor = getDefaultCompanyColor(companyId)
  const isCustom = currentColor !== defaultColor

  // Indicator position on the ring (outer=80, inner=48 → mid=64)
  const R_MID = 64
  const HALF  = 80
  const rad   = ((hue - 90) * Math.PI) / 180
  const ix    = HALF + R_MID * Math.cos(rad)
  const iy    = HALF + R_MID * Math.sin(rad)

  function pickFromPointer(e: React.PointerEvent) {
    const rect = wheelRef.current!.getBoundingClientRect()
    const cx = rect.left + rect.width  / 2
    const cy = rect.top  + rect.height / 2
    const dx = e.clientX - cx
    const dy = e.clientY - cy
    const r  = Math.hypot(dx, dy)
    if (r < rect.width * 0.3 || r > rect.width * 0.5) return
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
    if (angle < 0)    angle += 360
    if (angle >= 360) angle -= 360
    onChange(hslToHex(Math.round(angle), 62, 58))
  }

  return (
    <>
      {/* Click-away backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 18 }}
      />

      {/* Popover */}
      <div
        className="animate-scale-in"
        style={{
          position: 'absolute',
          top: 40, left: 0,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-lg)',
          padding: '16px 16px 12px',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          userSelect: 'none',
        }}
      >
        {/* Color wheel */}
        <div
          ref={wheelRef}
          style={{
            width: 160, height: 160,
            borderRadius: '50%',
            background: WHEEL_GRADIENT,
            cursor: 'crosshair',
            position: 'relative',
            flexShrink: 0,
          }}
          onPointerDown={e => {
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            pickFromPointer(e)
          }}
          onPointerMove={e => { if (dragging.current) pickFromPointer(e) }}
          onPointerUp={() => { dragging.current = false }}
        >
          {/* Center hole with current color preview */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 96, height: 96,
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: currentColor,
              boxShadow: `0 0 0 3px var(--bg-secondary), 0 0 0 4px ${currentColor}60`,
              transition: 'background 0.1s ease',
            }} />
          </div>

          {/* Hue indicator dot */}
          <div style={{
            position: 'absolute',
            left: ix - 8, top: iy - 8,
            width: 16, height: 16,
            borderRadius: '50%',
            background: currentColor,
            border: '2.5px solid #fff',
            boxShadow: '0 1px 5px rgba(0,0,0,0.45)',
            pointerEvents: 'none',
            transition: 'left 0.05s, top 0.05s',
          }} />
        </div>

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
            background: currentColor,
            border: '1px solid var(--border-default)',
            transition: 'background 0.1s ease',
          }} />
          <code style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1 }}>{currentColor}</code>
          {isCustom && (
            <button
              onClick={onReset}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, padding: '2px 7px', whiteSpace: 'nowrap' }}
            >
              Redefinir
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ── CompanyCard ────────────────────────────────────────────────────────────────

function CompanyCard({ company, onSelect }: { company: CompanyWithStats; onSelect: (id: string) => void }) {
  const color = getCompanyColor(company.id)

  return (
    <div
      className="surface"
      onClick={() => onSelect(company.id)}
      style={{
        padding: '18px 20px', cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        minHeight: 130, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative',
        borderLeft: `3px solid ${color}`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'
        el.style.borderColor = color
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
        el.style.borderColor = 'var(--border-default)'
      }}
    >
      <span style={{ position: 'absolute', top: 12, right: 12 }}>
        <HeatBadge heat={company.heat} />
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {company.image_url ? (
          <img src={company.image_url} alt={company.name}
            style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-muted)' }} />
        ) : (
          <div style={{
            width: 38, height: 38, borderRadius: 8, flexShrink: 0,
            background: color + '1a', color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, border: `1px solid ${color}30`,
          }}>
            {company.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 72 }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {company.name}
          </p>
          {company.phone && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{company.phone}</p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 'auto' }}>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color }}>{fmt(Number(company.total_revenue))}</p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>receita total</p>
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{company.total_sales}</p>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>vendas</p>
        </div>
      </div>
    </div>
  )
}
