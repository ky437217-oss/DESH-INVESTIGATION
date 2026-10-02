/*
  Internal news-page patch
  Homepage cards -> /news/<slug>
*/

const originalPath = window.location.pathname;

function getNewsSlug() {
  if (!originalPath.startsWith("/news/")) return null;
  return decodeURIComponent(originalPath.substring(6)).replace(/\/+$/, "");
}

async function loadInternalNewsPage() {
  const slug = getNewsSlug();
  if (!slug) return false;

  try {
    const response = await fetch("/api/published-news");
    if (!response.ok) throw new Error("News API failed");

    const news = await response.json();
    const article = news.find(item =>
      String(item?.slug || item?.id || "") === slug
    );

    if (!article) {
      document.body.innerHTML = `
        <main style="max-width:900px;margin:80px auto;padding:24px;font-family:Arial">
          <h1>News Not Found</h1>
          <p>यह खबर उपलब्ध नहीं है।</p>
          <a href="/">← Desh Investigation पर वापस जाएँ</a>
        </main>`;
      return true;
    }

    const title = article.seoTitle || article.title || article.headline || "";
    const subheadline = article.subheadline || "";
    const summary = article.summary || "";
    const image =
      article.featuredImageUrl ||
      article.imageUrl ||
      article.image ||
      "";

    const keyPoints = Array.isArray(article.keyPoints)
      ? article.keyPoints
      : Array.isArray(article.keyFacts)
        ? article.keyFacts
        : [];

    const sources = Array.isArray(article.sources)
      ? article.sources
      : [];

    document.title = `${title} | Desh Investigation`;

    document.body.innerHTML = `
      <main class="internal-news-page">
        <article class="news-article">

          <a class="back-home" href="/">← सभी खबरों पर वापस जाएँ</a>

          <header class="news-header">
            <div class="news-category">
              ${escapeHtml(article.categoryName || article.category || "NEWS")}
            </div>

            <h1>${escapeHtml(title)}</h1>

            ${
              subheadline
                ? `<p class="news-subheadline">${escapeHtml(subheadline)}</p>`
                : ""
            }

            <div class="news-meta">
              Desh Investigation
              ${
                article.publishedAt
                  ? ` • ${escapeHtml(formatNewsDate(article.publishedAt))}`
                  : ""
              }
            </div>
          </header>

          ${
            image
              ? `
                <figure class="news-hero">
                  <img
                    src="/api/image?url=${encodeURIComponent(image)}"
                    alt="${escapeHtml(title)}"
                    loading="eager"
                    onerror="this.parentElement.style.display='none'"
                  >
                </figure>
              `
              : ""
          }

          <section class="news-content">

            ${
              summary
                ? `
                  <div class="news-summary">
                    ${renderNewsText(summary)}
                  </div>
                `
                : ""
            }

            ${
              keyPoints.length
                ? `
                  <section class="news-section">
                    <h2>मुख्य बिंदु</h2>
                    <ul>
                      ${keyPoints
                        .map(point => `<li>${escapeHtml(String(point))}</li>`)
                        .join("")}
                    </ul>
                  </section>
                `
                : ""
            }

            ${
              article.analysis
                ? `
                  <section class="news-section">
                    <h2>विश्लेषण</h2>
                    ${renderNewsText(article.analysis)}
                  </section>
                `
                : ""
            }

            ${
              article.factCheck || article.factChecks
                ? `
                  <section class="news-section">
                    <h2>फैक्ट चेक</h2>
                    ${renderNewsText(
                      article.factCheck || article.factChecks
                    )}
                  </section>
                `
                : ""
            }

            ${
              sources.length
                ? `
                  <section class="news-section">
                    <h2>स्रोत</h2>
                    <ul class="source-list">
                      ${sources
                        .map(source => {
                          const url =
                            typeof source === "string"
                              ? source
                              : source?.url || source?.link || "";

                          const name =
                            typeof source === "string"
                              ? source
                              : source?.name ||
                                source?.title ||
                                url;

                          return url
                            ? `<li>
                                <a href="${escapeAttribute(url)}"
                                   target="_blank"
                                   rel="noopener noreferrer">
                                  ${escapeHtml(name)}
                                </a>
                               </li>`
                            : `<li>${escapeHtml(name)}</li>`;
                        })
                        .join("")}
                    </ul>
                  </section>
                `
                : ""
            }

          </section>

          <footer class="news-footer">
            <a href="/">← Desh Investigation पर वापस जाएँ</a>
          </footer>

        </article>
      </main>
    `;

    injectInternalNewsStyles();
    return true;

  } catch (error) {
    console.error(error);

    document.body.innerHTML = `
      <main style="max-width:900px;margin:80px auto;padding:24px;font-family:Arial">
        <h1>News Load Error</h1>
        <p>खबर लोड नहीं हो सकी।</p>
        <a href="/">← वापस जाएँ</a>
      </main>`;

    return true;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function renderNewsText(value) {
  if (value == null) return "";

  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .filter(Boolean)
      .map(line => `<p>${escapeHtml(line)}</p>`)
      .join("");
  }

  return `<p>${escapeHtml(JSON.stringify(value))}</p>`;
}

function formatNewsDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("hi-IN", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(date);
}

function injectInternalNewsStyles() {
  const style = document.createElement("style");

  style.textContent = `
    .internal-news-page {
      min-height:100vh;
      padding:40px 20px;
      background:#fff;
      color:#111;
    }

    .news-article {
      max-width:920px;
      margin:0 auto;
    }

    .back-home {
      display:inline-block;
      margin-bottom:28px;
      color:#b00020;
      text-decoration:none;
      font-weight:700;
    }

    .news-category {
      display:inline-block;
      margin-bottom:14px;
      padding:6px 12px;
      border-radius:999px;
      background:#111;
      color:#fff;
      font-size:13px;
      font-weight:700;
    }

    .news-header h1 {
      margin:0;
      font-size:clamp(32px,5vw,58px);
      line-height:1.08;
    }

    .news-subheadline {
      margin:18px 0 0;
      font-size:21px;
      line-height:1.55;
      color:#555;
    }

    .news-meta {
      margin-top:18px;
      color:#777;
      font-size:14px;
    }

    .news-hero {
      margin:35px 0;
      overflow:hidden;
      border-radius:18px;
      background:#eee;
    }

    .news-hero img {
      display:block;
      width:100%;
      max-height:560px;
      object-fit:cover;
    }

    .news-content {
      font-size:18px;
      line-height:1.8;
    }

    .news-summary {
      padding:22px;
      margin-bottom:30px;
      border-left:4px solid #b00020;
      background:#f7f7f7;
      border-radius:8px;
    }

    .news-section {
      margin:38px 0;
    }

    .news-section h2 {
      font-size:28px;
      margin-bottom:15px;
    }

    .news-section p {
      margin:0 0 14px;
    }

    .news-section li {
      margin:8px 0;
    }

    .source-list a {
      color:#b00020;
      word-break:break-word;
    }

    .news-footer {
      margin-top:55px;
      padding-top:25px;
      border-top:1px solid #ddd;
    }

    .news-footer a {
      color:#b00020;
      text-decoration:none;
      font-weight:700;
    }

    @media (max-width:600px) {
      .internal-news-page {
        padding:25px 15px;
      }

      .news-header h1 {
        font-size:32px;
      }

      .news-content {
        font-size:17px;
      }
    }
  `;

  document.head.appendChild(style);
}

loadInternalNewsPage();
