import type { NextConfig } from "next";

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
      // Supabase API calls
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
