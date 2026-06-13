import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { DashboardClient } from './DashboardClient'
import type { Company, CompanyWithStats } from '@/types'

export default async function HomePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let companies: CompanyWithStats[] = []
  try {
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
    companies = rows.map(r => ({
      ...(r as unknown as Company),
      total_revenue: Number(r.total_revenue ?? 0),
      total_sales: Number(r.total_sales ?? 0),
      last_sale_date: r.last_sale_date as string | null,
      heat: (r.heat as 'hot' | 'warm' | 'cold') ?? 'cold',
    }))
  } catch {
    // DB not ready yet — will show empty state
  }

  return <DashboardClient user={session} initialCompanies={companies} />
}
