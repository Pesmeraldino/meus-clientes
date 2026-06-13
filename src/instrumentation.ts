export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('./lib/migrate')
    try {
      await runMigrations()
    } catch (err) {
      console.error('[migrate] startup migration failed:', err)
    }
  }
}
