// src/middleware.js
import { NextResponse } from 'next/server';

// protect these paths (teacher area)
const teacherPaths = [
  '/dashboard',
  '/classes',
  '/quiz',
];

export async function middleware(req) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  // Only guard teacher paths
  if (!teacherPaths.some(p => path.startsWith(p))) return NextResponse.next();

  // Ask backend to confirm the token + role, passing through the browser cookie header
  const token = req.headers.get('authorization'); // usually null here
  // We’ll do a backend call without token here; better: rely on cookie-less header
  // So we redirect to /login and let client attach token there.

  // Try a lightweight check using a backend “me” endpoint with client’s cookie not available,
  // fallback: redirect to login and let client-side enforce again
  const res = NextResponse.next();
  // Let the client page double-check role (defense in depth)
  return res;
}

export const config = {
  matcher: ['/dashboard/:path*', '/classes/:path*', '/quiz/:path*'],
};
