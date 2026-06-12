import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import type { CompanyStats } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  const company = await queryOne('SELECT id FROM companies WHERE id = $1 AND user_id = $2', [id, session.id])
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

  const [totals] = await query<{ total_revenue: string; total_sales: string; total_clients: string; total_products: string }>(
    `SELECT
       COALESCE(SUM(s.total_price), 0) AS total_revenue,
       COUNT(DISTINCT s.id) AS total_sales,
       COUNT(DISTINCT cl.id) AS total_clients,
       COUNT(DISTINCT pr.id) AS total_products
     FROM companies c
     LEFT JOIN sales s ON s.company_id = c.id
     LEFT JOIN clients cl ON cl.company_id = c.id
     LEFT JOIN products pr ON pr.company_id = c.id
     WHERE c.id = $1`,
    [id]
  )

  const monthly_revenue = await query<{ month: string; revenue: number }>(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', sale_date), 'YYYY-MM') AS month,
       SUM(total_price) AS revenue
     FROM sales
     WHERE company_id = $1 AND sale_date >= NOW() - INTERVAL '12 months'
     GROUP BY DATE_TRUNC('month', sale_date)
     ORDER BY DATE_TRUNC('month', sale_date) ASC`,
    [id]
  )

  const top_clients = await query<{ client_id: string; name: string; total: number; sales_count: number }>(
    `SELECT cl.id AS client_id, cl.name, SUM(s.total_price) AS total, COUNT(s.id) AS sales_count
     FROM sales s
     JOIN clients cl ON cl.id = s.client_id
     WHERE s.company_id = $1
     GROUP BY cl.id, cl.name
     ORDER BY total DESC
     LIMIT 8`,
    [id]
  )

  const top_products = await query<{ product_id: string; name: string; total: number; quantity: number }>(
    `SELECT p.id AS product_id, p.name, SUM(s.total_price) AS total, SUM(s.quantity) AS quantity
     FROM sales s
     JOIN products p ON p.id = s.product_id
     WHERE s.company_id = $1
     GROUP BY p.id, p.name
     ORDER BY total DESC
     LIMIT 5`,
    [id]
  )

  const recent_sales = await query(
    `SELECT s.*, cl.name AS client_name, p.name AS product_name
     FROM sales s
     JOIN clients cl ON cl.id = s.client_id
     JOIN products p ON p.id = s.product_id
     WHERE s.company_id = $1
     ORDER BY s.sale_date DESC, s.created_at DESC
     LIMIT 10`,
    [id]
  )

  const stats: CompanyStats = {
    total_revenue: Number(totals?.total_revenue ?? 0),
    total_sales: Number(totals?.total_sales ?? 0),
    total_clients: Number(totals?.total_clients ?? 0),
    total_products: Number(totals?.total_products ?? 0),
    monthly_revenue,
    top_clients,
    top_products,
    recent_sales: recent_sales as unknown as CompanyStats['recent_sales'],
  }

  return NextResponse.json({ stats })
}
