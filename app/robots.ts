import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Account and admin pages are private; there's nothing to index.
      disallow: ["/admin", "/auth/", "/create", "/my-listings", "/saved", "/settings/", "/listings/*/edit", "/reset-password"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
