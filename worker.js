function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function text(data, status = 200, contentType = "text/plain; charset=utf-8") {
  return new Response(data, {
    status,
    headers: {
      "content-type": contentType
    }
  });
}

function fallbackImage() {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <rect width="1200" height="675" fill="#111111"/>
  <rect x="40" y="40" width="1120" height="595" rx="24" fill="#181818" stroke="#333333" stroke-width="3"/>
  <text x="600" y="315"
        text-anchor="middle"
        fill="#ffffff"
        font-family="Arial, sans-serif"
        font-size="64"
        font-weight="700">
    DESH INVESTIGATION
  </text>
  <text x="600" y="380"
        text-anchor="middle"
        fill="#aaaaaa"
        font-family="Arial, sans-serif"
        font-size="28">
    Image unavailable
  </text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=3600"
    }
  });
}

async function loadNews(env, request) {
  const url = new URL("/data/published-news.json", request.url);

  const response = await env.ASSETS.fetch(
    new Request(url.toString())
  );

  if (!response.ok) {
    throw new Error("published-news.json unavailable");
  }

  const data = await response.json();

  return Array.isArray(data) ? data : [];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "Desh Investigation",
        platform: "Cloudflare Workers",
        time: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/published-news") {
      try {
        const news = await loadNews(env, request);
        return json(news);
      } catch {
        return json({
          error: "News data unavailable"
        }, 500);
      }
    }

    if (url.pathname === "/api/image") {
      const target = url.searchParams.get("url");

      if (!target) {
        return fallbackImage();
      }

      let imageUrl;

      try {
        imageUrl = new URL(target);
      } catch {
        return fallbackImage();
      }

      if (!["http:", "https:"].includes(imageUrl.protocol)) {
        return fallbackImage();
      }

      try {
        const response = await fetch(imageUrl.toString(), {
          redirect: "follow",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
            "Accept":
              "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
          },
          cf: {
            cacheTtl: 3600,
            cacheEverything: true
          }
        });

        if (!response.ok) {
          return fallbackImage();
        }

        const contentType =
          response.headers.get("content-type") || "";

        const type = contentType.toLowerCase();

        const isImage =
          type.startsWith("image/") ||
          type.includes("octet-stream");

        if (!isImage) {
          return fallbackImage();
        }

        const headers = new Headers();

        headers.set(
          "content-type",
          type.includes("octet-stream")
            ? "image/jpeg"
            : contentType
        );

        headers.set(
          "cache-control",
          "public, max-age=3600, s-maxage=3600"
        );

        headers.set(
          "access-control-allow-origin",
          "*"
        );

        return new Response(response.body, {
          status: 200,
          headers
        });

      } catch {
        return fallbackImage();
      }
    }

    if (url.pathname === "/data/published-news.json") {
      return text("Not Found", 404);
    }

    if (url.pathname === "/robots.txt") {
      return text(
        `User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml\n`
      );
    }

    if (url.pathname === "/sitemap.xml") {
      let news = [];

      try {
        news = await loadNews(env, request);
      } catch {}

      const urls = [
        `${url.origin}/`,
        ...news
          .map(item => {
            const slug = item?.slug || item?.id;

            return slug
              ? `${url.origin}/news/${slug}`
              : null;
          })
          .filter(Boolean)
      ];

      const uniqueUrls = [...new Set(urls)];

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls.map(u => `  <url><loc>${escapeXml(u)}</loc></url>`).join("\n")}
</urlset>`;

      return text(
        sitemap,
        200,
        "application/xml; charset=utf-8"
      );
    }

    if (url.pathname === "/feed.xml") {
      let news = [];

      try {
        news = await loadNews(env, request);
      } catch {}

      const items = news.slice(0, 50).map(item => {
        const slug = item?.slug || item?.id || "";
        const link = `${url.origin}/news/${slug}`;

        return `
<item>
  <title>${escapeXml(item?.title || item?.headline || "")}</title>
  <link>${escapeXml(link)}</link>
  <guid>${escapeXml(link)}</guid>
  <description>${escapeXml(item?.summary || item?.subheadline || "")}</description>
  <pubDate>${escapeXml(item?.publishedAt || "")}</pubDate>
</item>`;
      }).join("\n");

      const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Desh Investigation</title>
<link>${escapeXml(url.origin)}</link>
<description>Hindi news and investigation</description>
${items}
</channel>
</rss>`;

      return text(
        rss,
        200,
        "application/rss+xml; charset=utf-8"
      );
    }

    return env.ASSETS.fetch(request);
  }
};

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
