import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  // Prevent the page from being embedded in an iframe (clickjacking)
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Stop browsers from MIME-sniffing the content type
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Limit referrer info sent to third parties
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Force HTTPS for 1 year (enable once you have a valid TLS cert)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // Restrict browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Content Security Policy
  // Adjust the src directives if you add third-party scripts/fonts later.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js needs 'unsafe-inline' for its inline styles in dev; for
      // production you can tighten this with a nonce-based approach.
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Supabase API calls + audio sample CDNs (smplr soundfonts, Tone.js samples)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://gleitz.github.io https://cdn.jsdelivr.net",
      "img-src 'self' data: blob:",
      "media-src 'self' data: blob: https://gleitz.github.io https://cdn.jsdelivr.net",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// Tab slugs that get short-URL aliases (e.g. /metronome → /dashboard/metronome).
// The browser URL stays as the short form; Next.js serves the dashboard content.
const TAB_SLUGS = [
  'music',
  'chords',
  'metronome',
  'exercises',
  'fretboard-trainer',
  'practice',
] as const

const nextConfig: NextConfig = {
  // Explicitly set the workspace root so Turbopack doesn't get confused by
  // other package-lock.json files higher up in the filesystem.
  turbopack: {
    root: path.resolve(__dirname),
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  async rewrites() {
    return TAB_SLUGS.map((slug) => ({
      source: `/${slug}`,
      destination: `/dashboard/${slug}`,
    }))
  },
};

export default nextConfig;
