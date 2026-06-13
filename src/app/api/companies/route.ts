import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import type { Company, CompanyWithStats } from '@/types'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const rows = await query<Record<string, unknown>>(
    `SELECT c.*,
       COALESCE(SUM(s.total_price), 0) AS total_revenue,
       COUNT(s.id) AS total_sales,
       MAX(s.sale_date) AS last_sale_date,
       CASE
         WHEN MAX(s.sale_date) >= CURRENT_DATE - INTERVAL '7 days' THEN 'hot'
         WHEN MAX(s.sale_date) >= CURRENT_DATE - INTERVAL '30 days' THEN 'warm'
         ELSE 'cold'
       END AS heat
     FROM companies c
     LEFT JOIN sales s ON s.company_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY COALESCE(SUM(s.total_price), 0) DESC, c.created_at DESC`,
    [session.id]
  )

  const companies: CompanyWithStats[] = rows.map(r => ({
    ...(r as unknown as Company),
    total_revenue: Number(r.total_revenue ?? 0),
    total_sales: Number(r.total_sales ?? 0),
    last_sale_date: r.last_sale_date as string | null,
    heat: (r.heat as 'hot' | 'warm' | 'cold') ?? 'cold',
  }))

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
