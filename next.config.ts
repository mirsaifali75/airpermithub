import type { NextConfig } from "next";

/**
 * SEO landing aliases. Each short keyword URL permanently redirects to its
 * canonical page so link equity consolidates on one URL per topic.
 */
const seoAliases: Record<string, string> = {
  "/air-permits": "/permit-finder",
  "/air-permit-calculator": "/calculators",
  "/emissions-calculator": "/calculators",
  "/air-permit-search": "/permits",
  "/air-permit-jobs": "/jobs",
  "/air-quality-jobs": "/jobs",
  "/texas-air-permits": "/states/texas",
  "/new-mexico-air-permits": "/states/new-mexico",
  "/oil-gas-air-permits": "/industries/oil-gas",
  "/nsps": "/regulations/nsps",
  "/neshap": "/regulations/neshap",
  "/title-v": "/regulations/title-v",
  "/nsr": "/regulations/nsr",
  "/psd": "/regulations/psd",
  "/ap-42": "/regulations/ap-42",
};

const isDev = process.env.NODE_ENV !== "production";

/** Accounts open once the database, session secret, and email service are configured (see src/lib/auth/config.ts). */
const accounts = Boolean(process.env.DATABASE_URL && process.env.AUTH_SECRET && process.env.RESEND_API_KEY);

/**
 * Content Security Policy. Pages are statically generated, so scripts can't
 * carry per-request nonces; inline scripts are allowed but every external
 * origin is blocked. Vercel Analytics and Speed Insights load from the same
 * origin (/_vercel/*), so they need no extra entries.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_ACCOUNTS: accounts ? "1" : "0" },
  // Routes that render on request (the screening API, search) read the content
  // database export when the build wrote one; see src/lib/content/config.ts.
  outputFileTracingIncludes: { "/**": ["./.content/**/*.json"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return Object.entries(seoAliases).map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
