import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/about", "/projects", "/blog", "/contact"],
        disallow: ["/admin", "/account", "/api"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
