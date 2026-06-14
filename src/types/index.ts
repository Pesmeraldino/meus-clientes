export interface User {
  id: string
  name: string
  email: string
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  user_id: string
  name: string
  phone: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface CompanyWithStats extends Company {
  total_revenue: number
  total_sales: number
  last_sale_date: string | null
  heat: 'hot' | 'warm' | 'cold'
}

export interface Product {
  id: string
  company_id: string
  name: string
  description: string | null
  price: number
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  company_id: string
  name: string
  trade_name: string | null
  email: string | null
  phone: string | null
  cpf_cnpj: string | null
  address: string | null
  city: string | null
  created_at: string
  updated_at: string
  total_sales?: number
}

export interface Sale {
  id: string
  company_id: string
  client_id: string
  product_id: string
  order_id: string | null
  quantity: number
  unit_price: number
  total_price: number
  sale_date: string
  notes: string | null
  created_at: string
  client_name?: string
  product_name?: string
}

export interface SaleItem {
  product_id: string
  quantity: number
  unit_price: number
}

export interface CompanyStats {
  total_revenue: number
  total_sales: number
  total_clients: number
  total_products: number
  monthly_revenue: { month: string; revenue: number }[]
  top_clients: { client_id: string; name: string; total: number; sales_count: number }[]
  top_products: { product_id: string; name: string; total: number; quantity: number }[]
  recent_sales: Sale[]
}

export interface AuthUser {
  id: string
  name: string
  email: string
  avatar_url?: string | null
}
