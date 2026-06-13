import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import type { Company, Client, Product, CompanyStats } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params

  const company = await queryOne<Company>(
    'SELECT * FROM companies WHERE id = $1 AND user_id = $2',
    [id, session.id]
  )
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

  const [clients, products, recentSales] = await Promise.all([
    query<Client>(
      `SELECT c.*, COALESCE(SUM(s.total_price), 0) AS total_sales
       FROM clients c LEFT JOIN sales s ON s.client_id = c.id
       WHERE c.company_id = $1 GROUP BY c.id ORDER BY total_sales DESC`,
      [id]
    ),
    query<Product>('SELECT * FROM products WHERE company_id = $1 ORDER BY name', [id]),
    query(
      `SELECT s.*, c.name AS client_name, p.name AS product_name
       FROM sales s JOIN clients c ON c.id = s.client_id JOIN products p ON p.id = s.product_id
       WHERE s.company_id = $1 ORDER BY s.sale_date DESC, s.created_at DESC LIMIT 20`,
      [id]
    ),
  ])

  const [totals] = await query<{ total_revenue: string; total_sales: string }>(
    `SELECT COALESCE(SUM(total_price), 0) AS total_revenue, COUNT(*) AS total_sales FROM sales WHERE company_id = $1`,
    [id]
  )

  const [monthly_revenue, top_clients, top_products] = await Promise.all([
    query<{ month: string; revenue: number }>(
      `SELECT TO_CHAR(DATE_TRUNC('month', sale_date), 'YYYY-MM') AS month, SUM(total_price) AS revenue
       FROM sales WHERE company_id = $1 AND sale_date >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', sale_date) ORDER BY 1 ASC`,
      [id]
    ),
    query<{ client_id: string; name: string; total: number; sales_count: number }>(
      `SELECT cl.id AS client_id, cl.name, SUM(s.total_price) AS total, COUNT(s.id) AS sales_count
       FROM sales s JOIN clients cl ON cl.id = s.client_id WHERE s.company_id = $1
       GROUP BY cl.id, cl.name ORDER BY total DESC LIMIT 8`,
      [id]
    ),
    query<{ product_id: string; name: string; total: number; quantity: number }>(
      `SELECT p.id AS product_id, p.name, SUM(s.total_price) AS total, SUM(s.quantity) AS quantity
       FROM sales s JOIN products p ON p.id = s.product_id WHERE s.company_id = $1
       GROUP BY p.id, p.name ORDER BY total DESC LIMIT 5`,
      [id]
    ),
  ])

  const stats: CompanyStats = {
    total_revenue: Number(totals?.total_revenue ?? 0),
    total_sales: Number(totals?.total_sales ?? 0),
    total_clients: clients.length,
    total_products: products.length,
    monthly_revenue,
    top_clients,
    top_products,
    recent_sales: recentSales as unknown as CompanyStats['recent_sales'],
  }

  return NextResponse.json({ company, clients, products, stats })
}
