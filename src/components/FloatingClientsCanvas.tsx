'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { Client } from '@/types'

interface Props {
  clients: Client[]
  onSelectClient?: (client: Client) => void
}

interface Bubble {
  id: string
  name: string
  total_sales: number
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  alpha: number
}

const PALETTE = [
  '#58a6ff', '#3fb950', '#d2a8ff', '#ffa657',
  '#79c0ff', '#56d364', '#bc8cff', '#ffb77c',
  '#388bfd', '#2ea043', '#a371f7', '#fb8f44',
]

export function FloatingClientsCanvas({ clients, onSelectClient }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bubblesRef = useRef<Bubble[]>([])
  const rafRef = useRef<number>(0)
  const hoveredRef = useRef<string | null>(null)

  const initBubbles = useCallback((width: number, height: number) => {
    if (!clients.length) return

    const maxSales = Math.max(...clients.map(c => Number(c.total_sales ?? 0)), 1)
    const minR = 28
    const maxR = Math.min(width, height) * 0.18

    bubblesRef.current = clients.map((client, i) => {
      const sales = Number(client.total_sales ?? 0)
      const ratio = maxSales > 0 ? sales / maxSales : 0
      const radius = minR + (maxR - minR) * Math.sqrt(ratio)
      const angle = (i / clients.length) * Math.PI * 2
      const cx = width / 2 + Math.cos(angle) * (width * 0.28)
      const cy = height / 2 + Math.sin(angle) * (height * 0.28)

      return {
        id: client.id,
        name: client.name,
        total_sales: sales,
        x: Math.max(radius, Math.min(width - radius, cx)),
        y: Math.max(radius, Math.min(height - radius, cy)),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius,
        color: PALETTE[i % PALETTE.length],
        alpha: 0,
      }
    })
  }, [clients])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const W = rect.width
    const H = rect.height

    initBubbles(W, H)

    function draw() {
      if (!ctx || !canvas) return
      const isDark = document.documentElement.classList.contains('dark')
      ctx.clearRect(0, 0, W, H)

      bubblesRef.current.forEach(b => {
        b.alpha = Math.min(1, b.alpha + 0.025)

        b.x += b.vx
        b.y += b.vy

        b.vx += (Math.random() - 0.5) * 0.04
        b.vy += (Math.random() - 0.5) * 0.04
        b.vx *= 0.99
        b.vy *= 0.99

        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
        if (speed > 0.8) { b.vx = (b.vx / speed) * 0.8; b.vy = (b.vy / speed) * 0.8 }

        if (b.x - b.radius < 0) { b.x = b.radius; b.vx = Math.abs(b.vx) }
        if (b.x + b.radius > W) { b.x = W - b.radius; b.vx = -Math.abs(b.vx) }
        if (b.y - b.radius < 0) { b.y = b.radius; b.vy = Math.abs(b.vy) }
        if (b.y + b.radius > H) { b.y = H - b.radius; b.vy = -Math.abs(b.vy) }

        const isHovered = hoveredRef.current === b.id
        const scale = isHovered ? 1.08 : 1
        const r = b.radius * scale

        ctx.save()
        ctx.globalAlpha = b.alpha * (isHovered ? 1 : 0.9)

        const grad = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, r * 0.05, b.x, b.y, r)
        grad.addColorStop(0, b.color + 'cc')
        grad.addColorStop(1, b.color + '55')

        ctx.beginPath()
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        ctx.strokeStyle = b.color
        ctx.lineWidth = isHovered ? 2.5 : 1.5
        ctx.globalAlpha = b.alpha * (isHovered ? 1 : 0.6)
        ctx.stroke()

        ctx.globalAlpha = b.alpha
        ctx.fillStyle = isDark ? '#e6edf3' : '#1f2328'
        ctx.font = `${isHovered ? 600 : 500} ${Math.max(10, Math.min(13, r * 0.32))}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const maxW = r * 1.6
        let label = b.name
        if (ctx.measureText(label).width > maxW) {
          while (label.length > 1 && ctx.measureText(label + '…').width > maxW) {
            label = label.slice(0, -1)
          }
          label += '…'
        }
        ctx.fillText(label, b.x, b.y - (r > 32 ? 7 : 0))

        if (r > 32 && b.total_sales > 0) {
          ctx.font = `400 ${Math.max(9, Math.min(11, r * 0.26))}px -apple-system, sans-serif`
          ctx.fillStyle = isDark ? '#8b949e' : '#656d76'
          ctx.fillText(
            `R$ ${b.total_sales.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            b.x, b.y + 9
          )
        }

        ctx.restore()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => cancelAnimationFrame(rafRef.current)
  }, [clients, initBubbles])

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const hit = bubblesRef.current.find(b => {
      const dx = b.x - mx, dy = b.y - my
      return Math.sqrt(dx * dx + dy * dy) < b.radius
    })
    hoveredRef.current = hit?.id ?? null
    canvas.style.cursor = hit ? 'pointer' : 'default'
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onSelectClient) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const hit = bubblesRef.current.find(b => {
      const dx = b.x - mx, dy = b.y - my
      return Math.sqrt(dx * dx + dy * dy) < b.radius
    })
    if (hit) {
      const client = clients.find(c => c.id === hit.id)
      if (client) onSelectClient(client)
    }
  }

  if (!clients.length) {
    return (
      <div style={{
        border: '2px solid #000', borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-primary)', height: 340,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12, color: 'var(--text-placeholder)',
      }}>
        <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor" style={{ opacity: 0.4 }}>
          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664h10z"/>
        </svg>
        <p style={{ fontSize: 13 }}>Nenhum cliente cadastrado ainda</p>
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      style={{
        width: '100%', height: 340,
        border: '2px solid #000',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-primary)',
        display: 'block',
      }}
    />
  )
}
