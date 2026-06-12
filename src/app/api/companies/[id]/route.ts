import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import type { Company } from '@/types'

async function getCompanyForUser(companyId: string, userId: string) {
  return queryOne<Company>(
    'SELECT * FROM companies WHERE id = $1 AND user_id = $2',
    [companyId, userId]
  )
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  const company = await getCompanyForUser(id, session.id)
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

  return NextResponse.json({ company })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  const company = await getCompanyForUser(id, session.id)
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

  try {
    const { name, phone, image_url } = await req.json()
    const [updated] = await query<Company>(
      `UPDATE companies SET name = COALESCE($1, name), phone = COALESCE($2, phone),
       image_url = COALESCE($3, image_url), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [name ?? null, phone ?? null, image_url ?? null, id]
    )
    return NextResponse.json({ company: updated })
  } catch (err) {
    console.error('Update company error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  const company = await getCompanyForUser(id, session.id)
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

  await query('DELETE FROM companies WHERE id = $1', [id])
  return NextResponse.json({ ok: true })
}
