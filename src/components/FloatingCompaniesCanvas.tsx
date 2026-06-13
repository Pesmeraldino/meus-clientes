'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { CompanyWithStats } from '@/types'
import { getCompanyColor } from '@/lib/companyColor'

const PI2 = Math.PI * 2
const MIN_GAP = 6
const ATTRACTION = 0.004
const DAMPING    = 0.90

interface Bubble {
  id: string
  name: string
  radius: number
  x: number
  y: number
  vx: number
  vy: number
  heat: 'hot' | 'warm' | 'cold'
  img: HTMLImageElement | null
  imgReady: boolean
}

interface Props {
  companies: CompanyWithStats[]
  mode?: 'revenue' | 'recency'
  insetTop?: number
  insetBottom?: number
  onSelect?: (id: string) => void
}

function daysSinceSale(dateStr: string | null): number {
  if (!dateStr) return 365
  const days = (Date.now() - new Date(dateStr).getTime()) / 86400000
  return Math.max(0, days)
}

export function FloatingCompaniesCanvas({ companies, mode = 'revenue', insetTop = 0, insetBottom = 0, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bubblesRef = useRef<Bubble[]>([])
  const rafRef = useRef<number>(0)
  const hoveredRef = useRef<string | null>(null)
  const insetTopRef = useRef(insetTop)
  const insetBottomRef = useRef(insetBottom)
  const onSelectRef = useRef(onSelect)
  const router = useRouter()

  useEffect(() => { insetTopRef.current = insetTop },    [insetTop])
  useEffect(() => { insetBottomRef.current = insetBottom }, [insetBottom])
  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])

  // Build bubbles whenever companies or mode change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W  = canvas.offsetWidth  || Math.round(window.innerWidth * 0.9)
    const H  = canvas.offsetHeight || Math.round(window.innerHeight * 0.85)
    const iT = insetTopRef.current
    const iB = insetBottomRef.current
    const cx = W / 2
    const cy = iT + (H - iT - iB) / 2   // centre of usable area

    const usableH = H - iT - iB
    const minR = 34
    const maxR = Math.min(W, usableH) * 0.23
    const spread = Math.min(W, usableH) * 0.28

    // Pre-compute radii based on mode
    let radii: number[]
    if (mode === 'revenue') {
      const maxRevenue = Math.max(...companies.map(c => Number(c.total_revenue)), 1)
      radii = companies.map(c => {
        const revenue = Number(c.total_revenue)
        return minR + (maxR - minR) * Math.sqrt(revenue / maxRevenue)
      })
    } else {
      // recency: bigger = more time without a sale (colder = bigger)
      const stalenesses = companies.map(c => daysSinceSale(c.last_sale_date))
      const maxStaleness = Math.max(...stalenesses, 1)
      radii = stalenesses.map(s => minR + (maxR - minR) * Math.sqrt(s / maxStaleness))
    }

    const bubbles: Bubble[] = companies.map((c, i) => {
      const radius = radii[i]
      const angle = (i / Math.max(companies.length, 1)) * PI2 - Math.PI / 2
      const x = cx + Math.cos(angle) * spread
      const y = cy + Math.sin(angle) * spread

      let img: HTMLImageElement | null = null
      if (c.image_url) {
        img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = c.image_url
      }

      const bubble: Bubble = { id: c.id, name: c.name, radius, x, y, vx: 0, vy: 0, heat: c.heat, img, imgReady: false }
      if (img) img.onload = () => { bubble.imgReady = true }
      return bubble
    })

    bubblesRef.current = bubbles
  }, [companies, mode])

  // Canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sync = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function draw() {
      if (!canvas || !ctx) return
      const W  = canvas.width
      const H  = canvas.height
      const iT = insetTopRef.current
      const iB = insetBottomRef.current
      const cx = W / 2
      const cy = iT + (H - iT - iB) / 2   // spring target = centre of usable area
      ctx.clearRect(0, 0, W, H)

      const bubbles = bubblesRef.current
      const isDark = document.documentElement.classList.contains('dark')
      const letterColor = isDark ? '#e6edf3' : '#ffffff'

      // ── Physics ───────────────────────────────────────────────

      for (const b of bubbles) {
        b.vx += (cx - b.x) * ATTRACTION
        b.vy += (cy - b.y) * ATTRACTION
        b.vx *= DAMPING
        b.vy *= DAMPING
      }

      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const a = bubbles[i]
          const b = bubbles[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.hypot(dx, dy) || 0.001
          const minDist = a.radius + b.radius + MIN_GAP
          if (dist < minDist) {
            const overlap = (minDist - dist) * 0.5
            const nx = dx / dist
            const ny = dy / dist
            a.x -= nx * overlap
            a.y -= ny * overlap
            b.x += nx * overlap
            b.y += ny * overlap
            const dvx = b.vx - a.vx
            const dvy = b.vy - a.vy
            const relDot = dvx * nx + dvy * ny
            if (relDot < 0) {
              const impulse = relDot * 0.35
              a.vx += impulse * nx;  a.vy += impulse * ny
              b.vx -= impulse * nx;  b.vy -= impulse * ny
            }
          }
        }
      }

      for (const b of bubbles) {
        b.x += b.vx
        b.y += b.vy
        const hPad = b.radius + 8        // horizontal — small gap from panel edge
        const yMin = b.radius + 8 + iT  // top inset clears the overlay bar
        const yMax = H - b.radius - 8 - iB // bottom inset clears the overlay bar
        if (b.x < hPad)     { b.x = hPad;     b.vx =  Math.abs(b.vx) * 0.4 }
        if (b.x > W - hPad) { b.x = W - hPad; b.vx = -Math.abs(b.vx) * 0.4 }
        if (b.y < yMin)     { b.y = yMin;     b.vy =  Math.abs(b.vy) * 0.4 }
        if (b.y > yMax)     { b.y = yMax;     b.vy = -Math.abs(b.vy) * 0.4 }
      }

      // ── Render ────────────────────────────────────────────────

      for (const b of bubbles) {
        const isHovered = hoveredRef.current === b.id
        const color = getCompanyColor(b.id)   // unique company colour
        const r = b.radius

        // Ring + optional glow (hot companies glow, others just have a clean ring)
        ctx.save()
        ctx.beginPath()
        ctx.arc(b.x, b.y, r, 0, PI2)
        if (b.heat === 'hot') {
          ctx.shadowColor = color
          ctx.shadowBlur = isHovered ? 28 : 16
        } else if (b.heat === 'warm' && isHovered) {
          ctx.shadowColor = color
          ctx.shadowBlur = 12
        }
        ctx.strokeStyle = color
        ctx.lineWidth = isHovered ? 3.5 : 2
        ctx.globalAlpha = isHovered ? 1 : 0.85
        ctx.stroke()
        ctx.restore()

        ctx.save()
        ctx.beginPath()
        ctx.arc(b.x, b.y, r - 1, 0, PI2)
        ctx.clip()

        if (b.imgReady && b.img) {
          ctx.drawImage(b.img, b.x - r, b.y - r, r * 2, r * 2)
        } else {
          const grad = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, 0, b.x, b.y, r)
          grad.addColorStop(0, color + '50')
          grad.addColorStop(1, color + '18')
          ctx.fillStyle = grad
          ctx.fillRect(b.x - r, b.y - r, r * 2, r * 2)

          if (!isHovered) {
            ctx.fillStyle = letterColor
            ctx.font = `700 ${Math.max(14, Math.floor(r * 0.44))}px system-ui,-apple-system,sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(b.name.charAt(0).toUpperCase(), b.x, b.y)
          }
        }

        if (isHovered) {
          ctx.fillStyle = 'rgba(0,0,0,0.58)'
          ctx.fillRect(b.x - r, b.y - r, r * 2, r * 2)

          ctx.fillStyle = '#ffffff'
          const fontSize = Math.max(10, Math.floor(r * 0.21))
          ctx.font = `600 ${fontSize}px system-ui,-apple-system,sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'

          const maxW = r * 1.65
          const words = b.name.split(' ')
          const lines: string[] = []
          let cur = ''
          for (const w of words) {
            const test = cur ? `${cur} ${w}` : w
            if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w }
            else cur = test
          }
          if (cur) lines.push(cur)
          if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].slice(0, -1) + '…' }

          const lineH = fontSize * 1.35
          const startY = b.y - (lines.length - 1) * lineH * 0.5
          lines.forEach((line, li) => {
            ctx.fillText(line, b.x, startY + li * lineH, maxW)
          })
        }

        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  function getBubbleAt(e: React.MouseEvent<HTMLCanvasElement>): Bubble | null {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    for (const b of bubblesRef.current) {
      if (Math.hypot(mx - b.x, my - b.y) <= b.radius) return b
    }
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
      onMouseMove={e => {
        const b = getBubbleAt(e)
        hoveredRef.current = b?.id ?? null
        if (canvasRef.current) canvasRef.current.style.cursor = b ? 'pointer' : 'default'
      }}
      onMouseLeave={() => { hoveredRef.current = null }}
      onClick={e => {
        const b = getBubbleAt(e)
        if (!b) return
        if (onSelectRef.current) onSelectRef.current(b.id)
        else router.push(`/empresa/${b.id}`)
      }}
    />
  )
}
