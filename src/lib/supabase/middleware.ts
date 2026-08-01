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

  let user = null

  try {
    if (supabase) {
      const {
        data: { user: authenticatedUser },
      } = await supabase.auth.getUser()

      user = authenticatedUser
    }
  } catch {
    request.cookies
      .getAll()
      .filter(({ name }) => name.startsWith('sb-'))
      .forEach(({ name }) => {
        request.cookies.delete(name)
        supabaseResponse.cookies.delete(name)
      })
  }

  const isAuthPage = 
    request.nextUrl.pathname.startsWith('/signin') || 
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password')

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }

  if (user && (request.nextUrl.pathname.startsWith('/signin') || request.nextUrl.pathname.startsWith('/signup') || request.nextUrl.pathname === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Strict restriction for /parametres/acces: Only Super Admin allowed
  if (user && request.nextUrl.pathname.startsWith('/parametres/acces') && supabase) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = (profile?.role || '').toLowerCase();
    const isSuperAdmin = userRole === 'super admin' || user.email === 'footballclubtoro@gmail.com';

    if (!isSuperAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
