import { NextRequest, NextResponse } from 'next/server'
import { getSession, setSession } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import type { AuthUser } from '@/types'

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  return NextResponse.json({ user })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  try {
    // Ensure avatar_url column exists (idempotent migration)
    await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT')

    const { name, avatar_url } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
    }

    const updated = await queryOne<{ id: string; name: string; email: string; avatar_url: string | null }>(
      `UPDATE users SET name = $1, avatar_url = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, email, avatar_url`,
      [name.trim(), avatar_url ?? null, session.id]
    )

    if (!updated) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })

    const updatedUser: AuthUser = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatar_url: updated.avatar_url,
    }

    // Re-issue JWT cookie with updated user data
    await setSession(updatedUser)

    return NextResponse.json({ user: updatedUser })
  } catch (err) {
    console.error('Update profile error:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
