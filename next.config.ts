import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy-Report-Only", value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.clerk.accounts.dev https://api.tokenrouter.com https://api.e2b.dev https://*.ingest.com https://*.inngest.com; frame-src https://*.e2b.dev https://*.e2b.app https://*.clerk.accounts.dev; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
      ],
    }];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  webpack: { treeshake: { removeDebugLogging: true, excludeReplayIframe: true, excludeReplayShadowDOM: true, excludeReplayCompressionWorker: true } },
});
