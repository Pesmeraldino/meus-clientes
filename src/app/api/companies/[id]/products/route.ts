import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import type { Product } from '@/types'

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

  const products = await query<Product>(
    'SELECT * FROM products WHERE company_id = $1 ORDER BY name ASC',
    [id]
  )
  return NextResponse.json({ products })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  if (!(await verifyCompany(id, session.id))) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
  }

  try {
    const { name, description, price } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do produto é obrigatório.' }, { status: 400 })
    }
    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return NextResponse.json({ error: 'Preço inválido.' }, { status: 400 })
    }

    const [product] = await query<Product>(
      'INSERT INTO products (company_id, name, description, price) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, name.trim(), description ?? null, Number(price)]
    )
    return NextResponse.json({ product }, { status: 201 })
  } catch (err) {
    console.error('Create product error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
