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
    const body = await req.json()
    const { client_id, sale_date, notes } = body

    // Accept multi-item format { items: [{product_id, quantity, unit_price}] }
    // or legacy single-item format { product_id, quantity, unit_price }
    const items: Array<{ product_id: string; quantity: number; unit_price: number }> =
      body.items ?? [{ product_id: body.product_id, quantity: body.quantity, unit_price: body.unit_price }]

    if (!client_id) {
      return NextResponse.json({ error: 'Cliente é obrigatório.' }, { status: 400 })
    }
    if (!items.length || items.some(it => !it.product_id)) {
      return NextResponse.json({ error: 'Ao menos um produto é obrigatório.' }, { status: 400 })
    }
    for (const it of items) {
      if (!it.quantity || Number(it.quantity) < 1) {
        return NextResponse.json({ error: 'Quantidade deve ser ao menos 1.' }, { status: 400 })
      }
      if (it.unit_price === undefined || Number(it.unit_price) < 0) {
        return NextResponse.json({ error: 'Preço unitário inválido.' }, { status: 400 })
      }
    }

    const clientOk = await queryOne('SELECT id FROM clients WHERE id = $1 AND company_id = $2', [client_id, id])
    if (!clientOk) {
      return NextResponse.json({ error: 'Cliente não pertence a esta empresa.' }, { status: 400 })
    }
    for (const it of items) {
      const productOk = await queryOne('SELECT id FROM products WHERE id = $1 AND company_id = $2', [it.product_id, id])
      if (!productOk) {
        return NextResponse.json({ error: 'Um ou mais produtos não pertencem a esta empresa.' }, { status: 400 })
      }
    }

    const order_id = items.length > 1 ? crypto.randomUUID() : null
    const date = sale_date ?? new Date().toISOString().split('T')[0]
    const insertedIds: string[] = []

    for (const it of items) {
      const [row] = await query<{ id: string }>(
        `INSERT INTO sales (company_id, client_id, product_id, order_id, quantity, unit_price, sale_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [id, client_id, it.product_id, order_id, Number(it.quantity), Number(it.unit_price), date, notes ?? null]
      )
      insertedIds.push(row.id)
    }

    const sales = await query<Sale>(
      `SELECT s.*, cl.name AS client_name, p.name AS product_name
       FROM sales s
       JOIN clients cl ON cl.id = s.client_id
       JOIN products p ON p.id = s.product_id
       WHERE s.id = ANY($1::uuid[])
       ORDER BY s.created_at ASC`,
      [insertedIds]
    )

    return NextResponse.json({ sales, sale: sales[0] }, { status: 201 })
  } catch (err) {
    console.error('Create sale error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
