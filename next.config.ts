import type { NextConfig } from 'next';

// GitHub Pages serves this project from a subpath and can only host static
// files, so the Pages build (CI sets GITHUB_PAGES=true) is a static export
// with a basePath. Every other build — local dev and the Netlify deploy —
// stays a full Next.js app (SSR-capable) served from the domain root.
const isGithubPages = process.env.GITHUB_PAGES === 'true';
const basePath = isGithubPages ? '/777ritualdesigner' : '';

const nextConfig: NextConfig = {
  // Expose the base path to app code (metadata links, static asset hrefs).
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(isGithubPages
    ? {
        output: 'export' as const,
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
