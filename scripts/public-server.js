const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

const PORT = Number(process.env.PORT || 8788);

const PUBLISHED_FILE = path.join(
  DATA_DIR,
  "published-news.json"
);

app.use(express.json({ limit: "2mb" }));

/* -----------------------------------------
   STATIC PUBLIC WEBSITE
----------------------------------------- */

app.use(express.static(ROOT, {
  index: "index.html"
}));

/* -----------------------------------------
   PUBLISHED NEWS API
----------------------------------------- */


/* -----------------------------------------
   SEO NEWS ROUTE
----------------------------------------- */

app.get("/news/:slug", (req, res) => {

  try {

    if (!fs.existsSync(PUBLISHED_FILE)) {
      return res.status(404).send("News not found");
    }

    const published =
      JSON.parse(
        fs.readFileSync(
          PUBLISHED_FILE,
          "utf8"
        )
      );

    const slug =
      String(req.params.slug || "");

    const article =
      published.find(
        item =>
          String(item.slug || "") === slug
      );

    if (!article) {
      return res.status(404).send("News not found");
    }

    const indexFile =
      path.join(
        ROOT,
        "index.html"
      );

    let html =
      fs.readFileSync(
        indexFile,
        "utf8"
      );

    const bootstrap =
      `<script>window.__DESH_STORY_SLUG__=${JSON.stringify(slug)};</script>`;

    html =
      html.replace(
        "</head>",
        bootstrap + "</head>"
      );

    return res.send(html);

  } catch (error) {

    console.error(
      "SEO route error:",
      error.message
    );

    return res.status(500).send(
      "Server error"
    );
  }

});


/* -----------------------------------------
   SITEMAP
----------------------------------------- */

app.get("/sitemap.xml", (req, res) => {

  try {

    const published =
      fs.existsSync(PUBLISHED_FILE)
        ? JSON.parse(
            fs.readFileSync(
              PUBLISHED_FILE,
              "utf8"
            )
          )
        : [];

    const base =
      `http://127.0.0.1:${PORT}`;

    const urls = [
      `<url><loc>${base}/</loc></url>`
    ];

    for (const item of published) {

      if (!item.slug) continue;

      urls.push(
        `<url><loc>${base}/news/${encodeURIComponent(item.slug)}</loc></url>`
      );
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      urls.join("") +
      `</urlset>`;

    res.type("application/xml");
    return res.send(xml);

  } catch (error) {

    return res.status(500).send(
      "Unable to build sitemap"
    );
  }

});


/* -----------------------------------------
   ROBOTS
----------------------------------------- */

app.get("/robots.txt", (req, res) => {

  res.type("text/plain");

  return res.send(
`User-agent: *
Allow: /

Sitemap: http://127.0.0.1:${PORT}/sitemap.xml`
  );

});

app.get("/api/published-news", (req, res) => {

  try {

    if (!fs.existsSync(PUBLISHED_FILE)) {
      return res.json([]);
    }

    const data = JSON.parse(
      fs.readFileSync(
        PUBLISHED_FILE,
        "utf8"
      )
    );

    const published = Array.isArray(data)
      ? data
      : [];

    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    return res.json(published);

  } catch (error) {

    console.error(
      "Published news error:",
      error.message
    );

    return res.status(500).json({
      error: "Unable to read published news"
    });
  }
});

/* -----------------------------------------
   HEALTH
----------------------------------------- */

app.get("/api/health", (req, res) => {

  return res.json({
    ok: true,
    service: "desh-investigation-public",
    port: PORT
  });

});

/* -----------------------------------------
   IMAGE PROXY
----------------------------------------- */

function isSafeRemoteUrl(value) {

  try {

    const u = new URL(value);

    if (
      u.protocol !== "http:" &&
      u.protocol !== "https:"
    ) {
      return false;
    }

    const h =
      u.hostname.toLowerCase();

    const blocked =
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "::1" ||
      h.startsWith("10.") ||
      h.startsWith("192.168.") ||
      h.startsWith("169.254.") ||
      h.startsWith("172.16.") ||
      h.startsWith("172.17.") ||
      h.startsWith("172.18.") ||
      h.startsWith("172.19.") ||
      h.startsWith("172.20.") ||
      h.startsWith("172.21.") ||
      h.startsWith("172.22.") ||
      h.startsWith("172.23.") ||
      h.startsWith("172.24.") ||
      h.startsWith("172.25.") ||
      h.startsWith("172.26.") ||
      h.startsWith("172.27.") ||
      h.startsWith("172.28.") ||
      h.startsWith("172.29.") ||
      h.startsWith("172.30.") ||
      h.startsWith("172.31.");

    return !blocked;

  } catch {

    return false;
  }
}

app.get("/api/image", async (req, res) => {

  const imageUrl =
    String(req.query.url || "");

  if (!isSafeRemoteUrl(imageUrl)) {

    return res.status(400).json({
      error: "Invalid image URL"
    });

  }

  try {

    const controller =
      new AbortController();

    const timer =
      setTimeout(
        () => controller.abort(),
        12000
      );

    const response =
      await fetch(imageUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",

          "Accept":
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        },
        signal: controller.signal
      });

    clearTimeout(timer);

    if (!response.ok) {

      return res.status(
        response.status
      ).json({
        error: "Remote image failed",
        status: response.status
      });

    }

    const contentType =
      response.headers.get(
        "content-type"
      ) ||
      "application/octet-stream";

    if (
      !contentType.startsWith("image/") &&
      contentType !== "application/octet-stream"
    ) {

      return res.status(415).json({
        error: "Remote resource is not an image"
      });

    }

    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      );

    if (
      buffer.length >
      8 * 1024 * 1024
    ) {

      return res.status(413).json({
        error: "Image too large"
      });

    }

    res.setHeader(
      "Content-Type",
      contentType
    );

    res.setHeader(
      "Content-Length",
      buffer.length
    );

    res.setHeader(
      "Cache-Control",
      "public, max-age=86400, stale-while-revalidate=604800"
    );

    return res.send(buffer);

  } catch (error) {

    return res.status(502).json({
      error: "Image proxy failed",
      message:
        error?.name === "AbortError"
          ? "Request timed out"
          : String(
              error?.message || error
            )
    });

  }

});

/* -----------------------------------------
   START
----------------------------------------- */


app.get("/feed.xml", (req, res) => {

  try {

    const published = fs.existsSync(PUBLISHED_FILE)
      ? JSON.parse(
          fs.readFileSync(
            PUBLISHED_FILE,
            "utf8"
          )
        )
      : [];

    const baseUrl =
      String(
        process.env.SITE_URL ||
        "http://127.0.0.1:" + PORT
      ).replace(/\/$/, "");

    const items = published
      .filter(item => item.slug && item.title)
      .slice(0, 50)
      .map(item => {

        const link =
          baseUrl +
          "/news/" +
          encodeURIComponent(
            item.slug
          );

        const title =
          String(
            item.title || ""
          )
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        const description =
          String(
            item.summary ||
            item.analysis ||
            ""
          )
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        const pubDate =
          item.publishedAt ||
          item.published_at ||
          new Date().toISOString();

        return (
          "<item>" +
            "<title>" +
              title +
            "</title>" +

            "<link>" +
              link +
            "</link>" +

            "<guid isPermaLink=\"true\">" +
              link +
            "</guid>" +

            "<description>" +
              description +
            "</description>" +

            "<pubDate>" +
              new Date(
                pubDate
              ).toUTCString() +
            "</pubDate>" +

          "</item>"
        );

      })
      .join("");

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<rss version="2.0">' +
        "<channel>" +
          "<title>Desh Investigation</title>" +
          "<link>" +
            baseUrl +
          "</link>" +
          "<description>" +
            "Desh Investigation - source-based Hindi news and analysis." +
          "</description>" +
          "<language>hi-IN</language>" +
          items +
        "</channel>" +
      "</rss>";

    res.type("application/rss+xml");

    return res.send(xml);

  } catch (error) {

    console.error(
      "RSS error:",
      error.message
    );

    return res.status(500).send(
      "Unable to build RSS feed"
    );
  }

});


app.listen(
  PORT,
  "127.0.0.1",
  () => {

    console.log("");
    console.log(
      "=========================================="
    );
    console.log(
      " DESH INVESTIGATION PUBLIC NEWSROOM"
    );
    console.log(
      "=========================================="
    );

    console.log(
      `Website : http://127.0.0.1:${PORT}`
    );

    console.log(
      `API     : http://127.0.0.1:${PORT}/api/published-news`
    );

    console.log(
      `Health  : http://127.0.0.1:${PORT}/api/health`
    );

    console.log("");

  }
);


