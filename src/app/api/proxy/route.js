// src/app/api/proxy/route.js

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get('url')
  console.log('Target URL:', targetUrl)

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // src/app/api/proxy/route.js の冒頭付近で
  const parsedTargetUrl = new URL(targetUrl)

  if (
    parsedTargetUrl.hostname.includes('duckduckgo.com') &&
    parsedTargetUrl.pathname === '/l/' &&
    parsedTargetUrl.searchParams.has('uddg')
  ) {
    const encoded = parsedTargetUrl.searchParams.get('uddg')
    const decoded = decodeURIComponent(decodeURIComponent(encoded))

    const origin = req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('x-forwarded-host')}`
      : `http://${req.headers.get('host')}`

    const redirectUrl = `${origin}/view?url=${encodeURIComponent(decoded)}`
    console.log('🔁 DuckDuckGoリダイレクトURL →', redirectUrl)

    return Response.redirect(redirectUrl, 302)
  }



  try {
    // route.js の冒頭に追加
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (ProxyBrowser)',
      },
      redirect: 'manual', // ← ここ重要：リダイレクトさせない
    })

    // 302, 301 などで Location が付く場合はリダイレクト先を自分でハンドリング
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (location) {
        const redirectTarget = new URL(location, targetUrl).toString()

        // 自動的に view に遷移させる
        const origin = req.headers.get('x-forwarded-host')
          ? `${req.headers.get('x-forwarded-proto') || 'http'}://${req.headers.get('x-forwarded-host')}`
          : `http://${req.headers.get('host')}`

        const redirectUrl = `${origin}/view?url=${encodeURIComponent(redirectTarget)}`
        console.log('🔁 検知されたリダイレクト先 →', redirectUrl)
        return Response.redirect(redirectUrl, 302)
      }
    }


    const contentType = response.headers.get('content-type') || 'text/html'

    // バイナリ（画像やPDFなど）ならそのまま返す
    if (!contentType.includes('text/html')) {
      const buffer = await response.arrayBuffer()
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    let html = await response.text()
    html = html.replace(/&amp;/g, '&')

    let base
    try {
      base = new URL(targetUrl)
    } catch {
      base = new URL('https://example.com')
    }

    // <a href="..."> のリンクを一括で処理（DuckDuckGoのuddgリンクだけ置換）
    html = html.replace(/href=["']([^"']+)["']/gi, (match, hrefRaw) => {
      try {
        // ✅ DuckDuckGoリダイレクトリンクか判定
        if (hrefRaw.includes('duckduckgo.com/l/?uddg=')) {
          const urlObj = new URL(hrefRaw)
          const encodedTarget = urlObj.searchParams.get('uddg')
          if (!encodedTarget) return match

          const decodedUrl = decodeURIComponent(decodeURIComponent(encodedTarget))

          // ✅ すでに /view?url= が付いていないかチェック
          if (decodedUrl.includes('/view?url=')) return match

          return `href="/view?url=${encodeURIComponent(decodedUrl)}"`
        }

        // ✅ /l/?uddg=... の相対パス形式も処理
        if (hrefRaw.startsWith('/l/?uddg=')) {
          const encodedTarget = hrefRaw.split('uddg=')[1].split('&')[0]
          const decodedUrl = decodeURIComponent(decodeURIComponent(encodedTarget))

          if (decodedUrl.includes('/view?url=')) return match

          return `href="/view?url=${encodeURIComponent(decodedUrl)}"`
        }

        return match // その他のリンクはそのまま
      } catch {
        return match
      }
    })

    

    // ✅ リソースリンクは常に /api/proxy 経由にする（img, css, js, etc.）

    html = html.replace(/(src|href)=["']([^"']+)["']/gi, (match, attr, path) => {
      // ✅ 書き換えてはいけない条件
      if (
        path.startsWith('/view?url=') ||      // DuckDuckGo置換済リンク
        path.startsWith('/api/proxy?url=') || // すでに書き換え済み
        path.startsWith('data:') ||           // データURI
        /^https?:\/\//i.test(path)            // 絶対URLはスキップ（後で処理しているなら）
      ) {
        return match // 書き換えない
      }
    
      // ✅ "//host/path" → 絶対URL化
      if (path.startsWith('//')) {
        const absUrl = `https:${path}`
        return `${attr}="/api/proxy?url=${encodeURIComponent(absUrl)}"`
      }
    
      // ✅ 相対パス → baseを使って絶対URL化
      try {
        const absUrl = new URL(path, base).toString()
        return `${attr}="/api/proxy?url=${encodeURIComponent(absUrl)}"`
      } catch {
        return match // URL解析に失敗したら書き換えない
      }
    })
    

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Proxy error: ' + err.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
