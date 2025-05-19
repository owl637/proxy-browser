'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RootLayout({ children }) {
  const [input, setInput] = useState('')
  const router = useRouter()

  const handleSearch = () => {
    const trimmed = input.trim()
    if (!trimmed) return

    // URLとして有効か判定（http省略にも対応）
    const isLikelyUrl = (str) => {
      try {
        const url = new URL(/^https?:\/\//i.test(str) ? str : `http://${str}`)
        return url.hostname.includes('.')
      } catch {
        return false
      }
    }

    const targetUrl = isLikelyUrl(trimmed)
      ? (/^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`)
      : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`

    setInput('') // 入力欄をクリア（好みに応じて残してもOK）
    router.push(`/view?url=${encodeURIComponent(targetUrl)}`)
  }

  return (
    <html lang="ja">
      <body>
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: '#ffffff',
            padding: '12px 24px',
            borderBottom: '1px solid #ddd',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            zIndex: 1000,
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="URLまたは検索語"
            style={{
              flex: 1,
              maxWidth: '600px',
              padding: '10px 14px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#0070f3')}
            onBlur={(e) => (e.target.style.borderColor = '#ccc')}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '10px 18px',
              fontSize: '16px',
              borderRadius: '8px',
              backgroundColor: '#0070f3',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#005dd1')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#0070f3')}
          >
            表示
          </button>
        </div>
        {children}
      </body>
    </html>
  )
}
