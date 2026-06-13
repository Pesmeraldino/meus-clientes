import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import * as XLSX from 'xlsx'
import { getSession } from '@/lib/auth'
import { queryOne } from '@/lib/db'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedProduct {
  name: string
  description: string | null
  price: number
}

// ─── AI extraction (PDF only) ────────────────────────────────────────────────

const PDF_SYSTEM_PROMPT = `You are a product catalog extractor. Your job is to identify every product and its price from the provided document.

Return ONLY a valid JSON array with no other text before or after:
[{"name": "Product name", "description": "Description or null", "price": 9.90}]

Rules:
- Extract EVERY product mentioned — do not skip any
- "price" must be a positive number (strip R$, $, currency symbols; convert commas to dots, e.g. "1.299,90" → 1299.90)
- Set "price" to 0 only if there is truly no price listed for that product (e.g. "em breve", "brevemente", "BREVE")
- "description" should be a short string only if one is explicitly stated; otherwise use null
- Do not invent products, quantities, or prices not present in the document
- Normalize names: trim whitespace, fix obvious typos, consistent capitalization
- If the same product appears multiple times with different prices, include each variation separately
- If you encounter a grid/matrix (rows = brands, columns = variants, cells = product codes), expand each cell into an individual product entry`

function parseAIResponse(text: string): ParsedProduct[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const arr = JSON.parse(match[0])
    if (!Array.isArray(arr)) return []
    return arr
      .filter((item): item is Record<string, unknown> => item && typeof item === 'object' && typeof item.name === 'string' && item.name.trim())
      .map(item => ({
        name: String(item.name).trim(),
        description: item.description && String(item.description).trim() ? String(item.description).trim() : null,
        price: Math.max(0, parseFloat(String(item.price ?? 0).replace(',', '.')) || 0),
      }))
  } catch {
    return []
  }
}

async function extractFromPdf(bytes: Buffer): Promise<ParsedProduct[]> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY não configurada no servidor.')

  const client = new Anthropic({ apiKey: key })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 32768,
    system: PDF_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: bytes.toString('base64') },
        } as Parameters<typeof client.messages.create>[0]['messages'][0]['content'][number],
        { type: 'text', text: 'Extract all products and prices from this document.' },
      ],
    }],
  })
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return parseAIResponse(text)
}

// ─── Direct Excel/CSV parser ─────────────────────────────────────────────────
//
// Handles structured price lists without token limits.
// Column detection: scans all rows to identify which column has prices
// and which has product names.
// Matrix expansion: detects grid sections (brand × variant) and flattens them.

const isPrice = (s: string): boolean => {
  const n = parseFloat(s.replace(',', '.'))
  return !isNaN(n) && n > 0.01 && n < 999999 && !/[A-Za-z]/.test(s)
}

const isProductCode = (s: string): boolean => /^[A-Z]{1,6}\d{3,}$/i.test(s)

interface ColStats {
  priceCount: number
  textCount: number  // long descriptive text
  codeCount: number  // product codes like CH0010
  total: number
}

function detectColumns(rows: string[][]): { nameCol: number; priceCol: number; confidence: number } {
  const maxCol = Math.max(...rows.map(r => r.length), 0)
  const stats: ColStats[] = Array.from({ length: maxCol }, () => ({ priceCount: 0, textCount: 0, codeCount: 0, total: 0 }))

  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] || '').trim()
      if (!cell || c >= maxCol) continue
      stats[c].total++
      if (isPrice(cell)) {
        stats[c].priceCount++
      } else if (isProductCode(cell)) {
        stats[c].codeCount++
      } else if (cell.length > 5) {
        stats[c].textCount++
      }
    }
  }

  // Price column: highest ratio of price-looking values, ignoring columns that are mostly codes
  let priceCol = -1
  let maxScore = 0
  for (let c = 0; c < stats.length; c++) {
    const s = stats[c]
    if (s.total === 0) continue
    // Penalize columns that look like product-code columns
    const score = s.priceCount - s.codeCount * 0.5
    if (score > maxScore) { maxScore = score; priceCol = c }
  }

  // Name column: highest text count, must come before priceCol (or at pos 0 if priceCol=0)
  let nameCol = -1
  let maxText = 0
  const searchUpTo = priceCol > 0 ? priceCol : stats.length
  for (let c = 0; c < searchUpTo; c++) {
    if (stats[c].textCount > maxText) { maxText = stats[c].textCount; nameCol = c }
  }
  if (nameCol === -1 && priceCol > 0) nameCol = 0

  const confidence = priceCol >= 0 && rows.length > 0 ? stats[priceCol].priceCount / rows.length : 0
  return { nameCol, priceCol, confidence }
}

// Patterns that indicate a column/section header row (not a product row)
const HEADER_PATTERNS = /^(código|codigo|cod\.?|linha|nome|produto|descrição|descricao|price|preço|valor|amarela|vermelha|preto|azul|cor)$/i

function parseStructured(rows: string[][], nameCol: number, priceCol: number): ParsedProduct[] {
  const products: ParsedProduct[] = []
  let sectionName = ''
  let matrixColHeaders: string[] = []

  for (const row of rows) {
    const cells = row.map(c => (c || '').trim())
    const nonEmpty = cells.filter(Boolean)

    // Section header: single non-empty cell in the whole row
    if (nonEmpty.length === 1) {
      sectionName = nonEmpty[0]
      matrixColHeaders = []
      continue
    }

    const priceStr = cells[priceCol] ?? ''

    // Column header row: price cell matches a header word
    if (HEADER_PATTERNS.test(priceStr) || (HEADER_PATTERNS.test(cells[0] ?? '') && !isPrice(priceStr))) {
      matrixColHeaders = cells
      continue
    }

    // Skip rows where the name cell is clearly a header label
    const nameCellRaw = cells[nameCol] ?? ''
    if (HEADER_PATTERNS.test(nameCellRaw)) continue

    // ── Matrix row detection ──────────────────────────────────────────────
    // A matrix row has product codes in the columns between col 0 and priceCol
    if (priceCol > 2) {
      const middleCells = cells.slice(1, priceCol)
      const codeCount = middleCells.filter(isProductCode).length
      if (codeCount >= 2) {
        const lineLabel = cells[0]
        const price = isPrice(priceStr) ? Math.round(parseFloat(priceStr.replace(',', '.')) * 100) / 100 : 0
        middleCells.forEach((code, i) => {
          if (!isProductCode(code)) return
          const variantLabel = matrixColHeaders[i + 1] ?? String(i + 1)
          const nameParts = [sectionName, lineLabel, variantLabel, `(${code})`].filter(Boolean)
          products.push({ name: nameParts.join(' ').trim(), description: null, price })
        })
        continue
      }
    }

    // ── Standard product row ──────────────────────────────────────────────
    const name = nameCellRaw
    if (!name || name.length < 2) continue

    let price: number
    if (/breve/i.test(priceStr) || priceStr === '') {
      price = 0
    } else if (isPrice(priceStr)) {
      price = Math.round(parseFloat(priceStr.replace(',', '.')) * 100) / 100
    } else {
      continue // not a product row
    }

    products.push({ name, description: null, price })
  }

  return products
}

function extractFromExcel(bytes: Buffer): ParsedProduct[] {
  const workbook = XLSX.read(bytes, { type: 'buffer' })
  const allProducts: ParsedProduct[] = []

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName]
    // Get raw rows as arrays (no header parsing, preserves empty cells as '')
    const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    const rows = raw
      .map(row => (row as unknown[]).map(cell => String(cell ?? '').trim()))
      .filter(row => row.some(c => c)) // remove fully blank rows

    if (rows.length === 0) continue

    const { nameCol, priceCol, confidence } = detectColumns(rows)

    if (priceCol < 0 || confidence < 0.05) continue // sheet has no recognizable price column

    const parsed = parseStructured(rows, nameCol, priceCol)
    allProducts.push(...parsed)
  }

  return allProducts
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  const { id } = await params
  const company = await queryOne('SELECT id FROM companies WHERE id = $1 AND user_id = $2', [id, session.id])
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Erro ao processar o arquivo.' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

  const MAX_SIZE = 25 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Tamanho máximo: 25 MB.' }, { status: 400 })
  }

  const fname = file.name.toLowerCase()
  const isPdf = file.type === 'application/pdf' || fname.endsWith('.pdf')
  const isXls = fname.endsWith('.xlsx') || fname.endsWith('.xls') || file.type.includes('spreadsheet') || file.type.includes('excel')
  const isCsv = fname.endsWith('.csv') || file.type === 'text/csv'

  if (!isPdf && !isXls && !isCsv) {
    return NextResponse.json({ error: 'Formato não suportado. Envie um arquivo PDF, Excel (.xlsx/.xls) ou CSV.' }, { status: 400 })
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    let products: ParsedProduct[]

    if (isPdf) {
      // PDFs require AI — no structured parse possible
      if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada. Necessária para importar PDFs.' }, { status: 500 })
      }
      products = await extractFromPdf(bytes)
    } else {
      // Excel / CSV: parse directly — no token limits, handles any file size
      products = extractFromExcel(bytes)
    }

    if (products.length === 0) {
      return NextResponse.json({
        error: 'Nenhum produto encontrado no arquivo. Verifique se o arquivo contém uma tabela com nome e preço dos produtos.',
      }, { status: 422 })
    }

    return NextResponse.json({ products, count: products.length })

  } catch (err) {
    console.error('Import error:', err)
    const message = err instanceof Error ? err.message : 'Erro ao processar o arquivo.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
