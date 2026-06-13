'use client'

import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    setIsDark(next)
  }

  return (
    <button
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 40,
        height: 22,
        borderRadius: 11,
        border: '1px solid var(--border-default)',
        background: isDark ? 'var(--accent)' : 'var(--bg-tertiary)',
        cursor: 'pointer',
        padding: 0,
        position: 'relative',
        transition: 'background 0.25s ease, border-color 0.25s ease',
        flexShrink: 0,
      }}
    >
      {/* Knob */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 2,
          left: isDark ? 19 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
          transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isDark ? (
          <svg width="8" height="8" viewBox="0 0 16 16" fill="#5a4a38" aria-hidden="true">
            <path fillRule="evenodd" d="M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786z"/>
          </svg>
        ) : (
          <svg width="8" height="8" viewBox="0 0 16 16" fill="#7c5c3a" aria-hidden="true">
            <circle cx="8" cy="8" r="3.5"/>
          </svg>
        )}
      </span>
    </button>
  )
}
