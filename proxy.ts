import { NextResponse, type NextRequest } from "next/server";

/** Runs on every page request (Next.js 16 "proxy", formerly middleware).
 *  A fresh nonce per request: only Next's own scripts that carry it may run, so injected markup cannot execute.
 *  The app has no login in this demo, so there is no session work here. */
export function csp(nonce: string, dev = process.env.NODE_ENV === "development"): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // styles cannot run code; scripts are what matters
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'", // the browser talks only to this app; model providers are called by the server
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // no upgrade-insecure-requests: every resource is same-origin, and it would break a plain-http trial on a LAN
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = csp(nonce);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|apple-icon.png|manifest.webmanifest).*)"],
};
