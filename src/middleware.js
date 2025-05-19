// middleware.js
import { NextResponse } from 'next/server'

export function middleware(request) {
  const url = request.nextUrl.clone()
  const response = NextResponse.next()
  response.headers.set('x-url', url.href)
  return response
}

export const config = {
  matcher: ['/view'],
}
