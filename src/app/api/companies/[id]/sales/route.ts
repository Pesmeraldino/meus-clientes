import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import type { Sale } from '@/types'

async function verifyCompany(companyId: string, userId: string) {
  return queryOne('SELECT id FROM companies WHERE id = $1 AND user_id = $2', [companyId, userId])
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  if (!(await verifyCompany(id, session.id))) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const offset = Number(searchParams.get('offset') ?? 0)

  const sales = await query<Sale>(
    `SELECT s.*, c.name AS client_name, p.name AS product_name
     FROM sales s
     JOIN clients c ON c.id = s.client_id
     JOIN products p ON p.id = s.product_id
     WHERE s.company_id = $1
     ORDER BY s.sale_date DESC, s.created_at DESC
     LIMIT $2 OFFSET $3`,
    [id, limit, offset]
  )
  return NextResponse.json({ sales })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  if (!(await verifyCompany(id, session.id))) {
    return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
  }

  try {
    const { client_id, product_id, quantity, unit_price, sale_date, notes } = await req.json()

    if (!client_id || !product_id) {
      return NextResponse.json({ error: 'Cliente e produto são obrigatórios.' }, { status: 400 })
    }
    if (!quantity || Number(quantity) < 1) {
      return NextResponse.json({ error: 'Quantidade deve ser ao menos 1.' }, { status: 400 })
    }
    if (unit_price === undefined || Number(unit_price) < 0) {
      return NextResponse.json({ error: 'Preço unitário inválido.' }, { status: 400 })
    }

    const clientOk = await queryOne('SELECT id FROM clients WHERE id = $1 AND company_id = $2', [client_id, id])
    const productOk = await queryOne('SELECT id FROM products WHERE id = $1 AND company_id = $2', [product_id, id])

    if (!clientOk || !productOk) {
      return NextResponse.json({ error: 'Cliente ou produto não pertence a esta empresa.' }, { status: 400 })
    }

    const [sale] = await query<Sale>(
      `INSERT INTO sales (company_id, client_id, product_id, quantity, unit_price, sale_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, client_id, product_id, Number(quantity), Number(unit_price), sale_date ?? new Date().toISOString().split('T')[0], notes ?? null]
    )
    return NextResponse.json({ sale }, { status: 201 })
  } catch (err) {
    console.error('Create sale error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
