import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = url && key
    ? createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      })
    : null

  // FIX: Prevent consuming refresh tokens on Next.js prefetch requests and API routes
  if (
    request.headers.get('x-middleware-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    request.nextUrl.pathname.startsWith('/api/')
  ) {
    return supabaseResponse;
  }

  let user = null;

  if (supabase) {
    try {
      const {
        data: { user: authenticatedUser },
      } = await supabase.auth.getUser()

      user = authenticatedUser
      if (!user) {
        const { data: { session } } = await supabase.auth.getSession()
        user = session?.user || null
      }
    } catch (err) {
      console.error('Supabase Middleware Error:', err);
    }
  }

  const isPublicRoute = 
    request.nextUrl.pathname.startsWith('/signin') || 
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/detection') ||
    request.nextUrl.pathname.startsWith('/inscription')

  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/signin'
    const redirectResponse = NextResponse.redirect(redirectUrl)
    
    // IMPORTANT: Transférer les cookies pour ne pas perdre l'état de la session (refresh token)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  if (user && (request.nextUrl.pathname.startsWith('/signin') || request.nextUrl.pathname.startsWith('/signup') || request.nextUrl.pathname === '/')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    const redirectResponse = NextResponse.redirect(redirectUrl)

    // IMPORTANT: Transférer les cookies pour ne pas perdre l'état de la session
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // Strict restriction for /parametres/acces: Only Super Admin allowed
  if (user && request.nextUrl.pathname.startsWith('/parametres/acces') && supabase) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = (profile?.role || user.user_metadata?.role || '').toLowerCase();
    const isSuperAdmin = userRole === 'super admin' || user.email?.toLowerCase() === 'footballclubtoro@gmail.com';

    if (!isSuperAdmin) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      const redirectResponse = NextResponse.redirect(redirectUrl)

      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
  }

  return supabaseResponse
}
