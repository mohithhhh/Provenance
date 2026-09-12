import type { NextConfig } from 'next';

// Every page here is static — no Next.js API routes, no server actions, no
// dynamic route params, all data comes from client-side fetches to
// apps/api. A static export is the simplest possible deploy target for
// that shape of app: Cloudflare Pages serves the `out/` directory directly,
// no adapter needed (see docs/deploy.md).
const nextConfig: NextConfig = {
  output: 'export',
};

export default nextConfig;
