import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import type { Client } from '@/types'

async function verifyCompany(companyId: string, userId: string) {
  return queryOne('SELECT id FROM companies WHERE id = $1 AND user_id = $2', [companyId, userId])
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  if (!(await verifyCompany(id, session.id))) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
  }

  const clients = await query<Client>(
    `SELECT c.*, COALESCE(SUM(s.total_price), 0) AS total_sales
     FROM clients c
     LEFT JOIN sales s ON s.client_id = c.id
     WHERE c.company_id = $1
     GROUP BY c.id
     ORDER BY total_sales DESC, c.name ASC`,
    [id]
  )
  return NextResponse.json({ clients })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  if (!(await verifyCompany(id, session.id))) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
  }

  try {
    const { name, email, phone, cpf_cnpj, address, city } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do cliente é obrigatório.' }, { status: 400 })
    }

    const [client] = await query<Client>(
      `INSERT INTO clients (company_id, name, email, phone, cpf_cnpj, address, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, name.trim(), email ?? null, phone ?? null, cpf_cnpj ?? null, address ?? null, city ?? null]
    )
    return NextResponse.json({ client }, { status: 201 })
  } catch (err) {
    console.error('Create client error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
