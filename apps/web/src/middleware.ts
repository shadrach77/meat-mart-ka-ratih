import { NextRequest, NextResponse } from 'next/server';
import { auth } from './auth';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const url = request.nextUrl;
  const path = url.pathname;
  const role = session?.user?.role;
  const { pathname } = request.nextUrl;

  if (
    (pathname.startsWith('/login') || pathname.startsWith('/register')) &&
    session?.user != null
  ) {
    return NextResponse.redirect(new URL('/', url.href));
  }
  if (session?.user) {
    if (
      pathname.startsWith('/dashboard') &&
      session?.user.role === 'CUSTOMER'
    ) {
      return NextResponse.redirect(new URL('/', url.href));
    }
    if (
      !pathname.startsWith('/dashboard') &&
      session?.user.role !== 'CUSTOMER'
    ) {
      return NextResponse.redirect(new URL('/dashboard', url.href));
    }
    if (pathname === '/dashboard' && session?.user.role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/', url.href));
    }
    if (role === 'CUSTOMER' && path.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/', url.href));
    }

    if ((role === 'ADMIN' || role === 'SUPER_ADMIN') && path === '/') {
      return NextResponse.redirect(new URL('/dashboard', url.href));
    }

    if (path.startsWith('/dashboard/users') && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', url.href));
    }

    if (path.startsWith('/dashboard/discounts') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', url.href));
    }

    if (
      path !== '/dashboard/products' &&
      path.startsWith('/dashboard/products') &&
      role !== 'SUPER_ADMIN'
    ) {
      // Let layout or page fetch correct store for redirection
      return NextResponse.redirect(new URL('/dashboard/products', url.href));
    }

    if (
      path !== '/dashboard/categories' &&
      path.startsWith('/dashboard/categories') &&
      role !== 'SUPER_ADMIN'
    ) {
      // Let layout or page fetch correct store for redirection
      return NextResponse.redirect(new URL('/dashboard/products', url.href));
    }
  } else {
    if (pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/', url.href));
    }
  }
}

export const config = {
  matcher: [
    '/',
    '/cart',
    '/payment',
    '/payment/:path+',
    '/transaction-list',
    '/order-list',
    '/register',
    '/login',
    '/profile',
    '/profile/:path+',
    '/dashboard',
    '/dashboard/:path+',
  ],
};
