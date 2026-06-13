export function hslToHex(h: number, s: number, l: number): string {
  l /= 100
  const a = (s / 100) * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * c).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h: number
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else                h = ((r - g) / d + 4) / 6
  return Math.round(h * 360)
}

function defaultColorFor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return hslToHex(Math.abs(hash) % 360, 62, 58)
}

// Module-level override map — persisted in localStorage
const colorOverrides = new Map<string, string>()

export function loadColorOverrides() {
  if (typeof window === 'undefined') return
  try {
    const stored = localStorage.getItem('company-colors')
    if (stored) {
      const store = JSON.parse(stored) as Record<string, string>
      Object.entries(store).forEach(([k, v]) => colorOverrides.set(k, v))
    }
  } catch {}
}

export function setCompanyColor(id: string, hex: string) {
  colorOverrides.set(id, hex)
  persist()
}

export function clearCompanyColor(id: string) {
  colorOverrides.delete(id)
  persist()
}

export function getCompanyColor(id: string): string {
  return colorOverrides.get(id) ?? defaultColorFor(id)
}

export function getDefaultCompanyColor(id: string): string {
  return defaultColorFor(id)
}

function persist() {
  if (typeof window === 'undefined') return
  try {
    const store: Record<string, string> = {}
    colorOverrides.forEach((v, k) => { store[k] = v })
    localStorage.setItem('company-colors', JSON.stringify(store))
  } catch {}
}
