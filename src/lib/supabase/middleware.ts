import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  )

  // Get current user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/signin') || request.nextUrl.pathname.startsWith('/signup')

  // If user is not logged in and tries to access a protected route
  if (!user && !isAuthPage && request.nextUrl.pathname !== '/') {
    // Redirect to signin
    const url = request.nextUrl.clone()
    url.pathname = '/signin'
    return NextResponse.redirect(url)
  }

  // If user is logged in and tries to access signin page or root
  if (user && (isAuthPage || request.nextUrl.pathname === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }
  
  // Role-based access control can be added here by fetching the profile
  if (user && request.nextUrl.pathname !== '/dashboard' && !isAuthPage) {
    // Note: Doing DB queries in middleware can slow down requests.
    // For large scale apps, RBAC info is better stored in JWT custom claims.
    // We do a simple fetch here for demonstration.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Example basic protection for Admin/Super Admin only routes
    if (request.nextUrl.pathname.startsWith('/parametres')) {
      if (role !== 'Super Admin' && role !== 'Admin') {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
