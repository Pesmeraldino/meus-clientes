import { db } from './db'

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: '001_init',
    sql: `
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        image_url VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        order_id UUID,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
        sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
      CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
      CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
      CREATE INDEX IF NOT EXISTS idx_sales_company_id ON sales(company_id);
      CREATE INDEX IF NOT EXISTS idx_sales_client_id ON sales(client_id);
      CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
      CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id);
    `,
  },
  {
    name: '002_order_id',
    sql: `
      ALTER TABLE sales ADD COLUMN IF NOT EXISTS order_id UUID;
      CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id);
    `,
  },
  {
    name: '003_avatar_url',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;`,
  },
  {
    name: '004_clients_extra_fields',
    sql: `
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
    `,
  },
  {
    name: '005_clients_trade_name',
    sql: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255);`,
  },
]

export async function runMigrations() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  for (const migration of MIGRATIONS) {
    const { rows } = await db.query('SELECT 1 FROM _migrations WHERE name = $1', [migration.name])
    if (rows.length > 0) continue

    console.log(`[migrate] applying ${migration.name}`)
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query(migration.sql)
      await client.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [migration.name])
      await client.query('COMMIT')
      console.log(`[migrate] done: ${migration.name}`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`[migrate] failed: ${migration.name}`, err)
      throw err
    } finally {
      client.release()
    }
  }
}
