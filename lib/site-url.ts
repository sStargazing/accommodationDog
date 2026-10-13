/**
 * The site's public origin for canonical URLs, Open Graph tags and the
 * sitemap. NEXT_PUBLIC_SITE_URL wins; on Vercel it falls back to the
 * production domain (or the deployment URL for previews) automatically.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const vercelHost =
    process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  return "http://localhost:3000";
}
