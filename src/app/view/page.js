'use client'

import { useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ViewPage() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [html, setHtml] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const url = searchParams.get('url')
    if (!url) return

    const encodedUrl = encodeURIComponent(url)
    fetch(`/api/proxy?url=${encodedUrl}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.text()
      })
      .then(setHtml)
      .catch((err) => setError(err.message))
  }, [searchParams, pathname]) // 👈 クエリもパスも監視！

  const url = searchParams.get('url')

  if (!url) {
    return <p>URLが指定されていません。</p>
  }

  if (error) {
    return <pre style={{ whiteSpace: 'pre-wrap', color: 'red' }}>{error}</pre>
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ width: '100%', minHeight: '100vh' }}
    />
  )
}
