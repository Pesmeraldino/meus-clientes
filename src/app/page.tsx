import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { DashboardClient } from './DashboardClient'
import type { Company } from '@/types'

export default async function HomePage() {
  const session = await getSession()
  if (!session) redirect('/login')

  let companies: Company[] = []
  try {
    companies = await query<Company>(
      'SELECT * FROM companies WHERE user_id = $1 ORDER BY created_at DESC',
      [session.id]
    )
  } catch {
    // DB not ready yet — will show empty state
  }

  return <DashboardClient user={session} initialCompanies={companies} />
}
