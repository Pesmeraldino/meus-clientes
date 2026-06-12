'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { CreateCompanyModal } from '@/components/modals/CreateCompanyModal'
import type { Company, AuthUser } from '@/types'

interface Props {
  user: AuthUser
  initialCompanies: Company[]
}

export function DashboardClient({ user, initialCompanies }: Props) {
  const [companies, setCompanies] = useState<Company[]>(initialCompanies)
  const [showCreate, setShowCreate] = useState(false)

  function handleCreated(company: Company) {
    setCompanies(prev => [company, ...prev])
    setShowCreate(false)
  }

  return (
    <>
      <Navbar user={user} />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Suas empresas
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              {companies.length === 0
                ? 'Nenhuma empresa cadastrada ainda'
                : `${companies.length} empresa${companies.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary" style={{ gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z"/>
            </svg>
            Nova empresa
          </button>
        </div>

        {companies.length === 0 ? (
          <div className="surface" style={{ padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-placeholder)' }}>
                <path d="M1.5 2.75A.75.75 0 0 1 2.25 2h11.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1-.75-.75V2.75zm1.5.75v9h10V3.5H3zm2.75 2.5a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zm4.5 0a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h3zm-4.5 3a.75.75 0 0 1 0 1.5h-1a.75.75 0 0 1 0-1.5h1zm4.5 0a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h3z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Nenhuma empresa ainda</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 340, margin: '0 auto 24px' }}>
              Crie sua primeira empresa para começar a gerenciar clientes e registrar vendas.
            </p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              Criar primeira empresa
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {companies.map(company => (
              <CompanyCard key={company.id} company={company} />
            ))}
            <button
              onClick={() => setShowCreate(true)}
              style={{
                border: '2px dashed var(--border-default)', borderRadius: 'var(--radius-lg)',
                background: 'transparent', padding: '32px 24px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, color: 'var(--text-placeholder)', transition: 'all 0.15s ease', minHeight: 140,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.color = 'var(--accent)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
                e.currentTarget.style.color = 'var(--text-placeholder)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2z"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Nova empresa</span>
            </button>
          </div>
        )}
      </main>

      {showCreate && <CreateCompanyModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </>
  )
}

function CompanyCard({ company }: { company: Company }) {
  return (
    <Link href={`/empresa/${company.id}`} style={{ textDecoration: 'none' }}>
      <div
        className="surface"
        style={{ padding: '20px 22px', cursor: 'pointer', transition: 'all 0.15s ease', minHeight: 140, display: 'flex', flexDirection: 'column', gap: 12 }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = 'translateY(-2px)'
          el.style.boxShadow = 'var(--shadow-md)'
          el.style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLDivElement
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'none'
          el.style.borderColor = 'var(--border-default)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {company.image_url ? (
            <img
              src={company.image_url} alt={company.name}
              style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-muted)' }}
            />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 8,
              background: 'var(--accent-subtle)', color: 'var(--accent-text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700,
            }}>
              {company.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company.name}</p>
            {company.phone && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{company.phone}</p>}
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--text-placeholder)' }}>
            Criada em {new Date(company.created_at).toLocaleDateString('pt-BR')}
          </span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-placeholder)' }}>
            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"/>
          </svg>
        </div>
      </div>
    </Link>
  )
}
