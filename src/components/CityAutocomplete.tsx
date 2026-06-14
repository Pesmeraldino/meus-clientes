'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (city: string) => void
  placeholder?: string
}

type IbgeMunicipio = {
  nome: string
  microrregiao: { mesorregiao: { UF: { sigla: string } } }
}

let cache: string[] | null = null

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

async function loadCities(): Promise<string[]> {
  if (cache) return cache
  const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome')
  const data: IbgeMunicipio[] = await res.json()
  cache = data.map(m => `${m.nome} - ${m.microrregiao.mesorregiao.UF.sigla}`)
  return cache
}

export function CityAutocomplete({ value, onChange, placeholder }: Props) {
  const [input, setInput] = useState(value)
  const [options, setOptions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const allCities = useRef<string[]>([])

  useEffect(() => { setInput(value) }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleChange(val: string) {
    setInput(val)
    onChange(val)

    if (!val.trim()) { setOptions([]); setOpen(false); return }

    if (!allCities.current.length) {
      setLoading(true)
      allCities.current = await loadCities()
      setLoading(false)
    }

    const q = normalize(val)
    const filtered = allCities.current
      .filter(c => normalize(c).includes(q))
      .slice(0, 8)
    setOptions(filtered)
    setOpen(filtered.length > 0)
  }

  function select(city: string) {
    setInput(city)
    onChange(city)
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        className="input"
        value={input}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => options.length > 0 && setOpen(true)}
        placeholder={placeholder ?? 'Digite a cidade'}
        autoComplete="off"
      />
      {loading && (
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-secondary)' }}>
          carregando…
        </div>
      )}
      {open && options.length > 0 && (
        <ul style={{
          position: 'absolute', zIndex: 50, top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', margin: 0, padding: '4px 0', listStyle: 'none',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {options.map(city => (
            <li
              key={city}
              onMouseDown={() => select(city)}
              style={{
                padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                color: 'var(--text-primary)', transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
