import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/blog/*", "/about", "/rules", "/login"],
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard",
          "/feed",
          "/inbox",
          "/leaderboard",
          "/profile",
          "/missions",
          "/tournaments",
          "/videos",
          "/studying",
          "/mission-rooms",
        ],
      },
    ],
    sitemap: "https://gcamp.ir/sitemap.xml",
  };
}
