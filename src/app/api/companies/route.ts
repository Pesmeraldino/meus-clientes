import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import type { Company } from '@/types'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const companies = await query<Company>(
    'SELECT * FROM companies WHERE user_id = $1 ORDER BY created_at DESC',
    [session.id]
  )
  return NextResponse.json({ companies })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  try {
    const { name, phone, image_url } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome da empresa é obrigatório.' }, { status: 400 })
    }

    const [company] = await query<Company>(
      'INSERT INTO companies (user_id, name, phone, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [session.id, name.trim(), phone ?? null, image_url ?? null]
    )
    return NextResponse.json({ company }, { status: 201 })
  } catch (err) {
    console.error('Create company error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
