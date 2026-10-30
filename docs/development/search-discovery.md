# Search discovery and the instruction booklet

The player manual lives at `public/manual.html` with `public/manual.css`. Vite copies both directly into the published site, so `/super-mormon/manual.html` works without a game download, client-side routing, or JavaScript. Keep this as the single manual; the README links to it. It deliberately has no link from gameplay or game menus. The sitemap and GitHub README make it discoverable.

Use the familiar invitation and sectioned, illustrated booklet format of classic platform-game manuals, with original text and existing project artwork. Keep the controls aligned with `src/game/controls/input.ts`, `controls.ts`, and `src/main.ts`; keep story order and names aligned with `src/game/runtime/progression.ts`. Verify introductions and optional per-adventure starting hints against world implementations. Give a concrete first step without revealing the entire solution. Do not document developer scene-entry parameters. Browser Print / Save as PDF is supported; check that hint text appears in print.

Search metadata uses accurate page titles, unique descriptions, canonical URLs, social previews, and factual VideoGame structured data. Audience terms (Latter-day Saint, LDS, Mormon, Sunday video game) appear naturally in the README and the manual’s family section. Avoid keyword lists, hidden keyword copy, unsupported ratings, promises of search ranking, or claims of Church endorsement. The game’s no-JavaScript fallback describes the same game; it does not link the booklet into gameplay.

Recommended repository description:

> A free 3D Book of Mormon adventure game for families. Explore 24 scripture stories in your browser with keyboard, touch, or a controller.

Repository homepage remains `https://cgood92.github.io/super-mormon/`. Relevant GitHub topics: `book-of-mormon`, `lds`, `latter-day-saints`, `scripture-game`, `browser-game`, `family-friendly`, `threejs`. Preserve unrelated existing topics when updating.

Before release, run `npm run format:check`, `npm test`, and `VITE_BASE_PATH=/super-mormon/ npm run build`. Preview that production build under `/super-mormon/`, check the manual at desktop and phone widths, its links and collapsed hints, print layout, and the game entry. The existing main-branch Pages deployment requires the owner’s approval. Changes reach the public URL only after merge and that deployment.

Google and Bing ownership verification tags are already configured in the game HTML; keep both permanently. Development tools remain marked `noindex` and stay outside the sitemap.

Google Search Console ownership is already configured in the game HTML. The owner can submit `https://cgood92.github.io/super-mormon/sitemap.xml` there after publication if desired. A sitemap assists discovery; indexing and rankings remain search-engine decisions.

References: [Google SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), and [title links](https://developers.google.com/search/docs/appearance/title-link). These favor useful crawlable content, descriptive titles, and natural language; Google does not use the meta keywords tag.

## Register after deployment

1. In [Google Search Console](https://search.google.com/search-console/), use the URL-prefix property `https://cgood92.github.io/super-mormon/`. A Domain property would require control of GitHub’s DNS. The owner verification tag is in `index.html`; keep it permanently. Verify after publishing.
2. Submit `https://cgood92.github.io/super-mormon/sitemap.xml` in Sitemaps, then inspect the game URL and request indexing once.
3. In [Bing Webmaster Tools](https://www.bing.com/webmasters/), import the verified Google property and sitemap, or verify the manually added URL using the Bing tag in `index.html`. Keep both verification tags permanently.

GitHub Pages serves this project below `/super-mormon/`. Its `robots.txt` is included for hosting portability, but crawlers look for `https://cgood92.github.io/robots.txt`; a file inside the project cannot control the host root. Submit the sitemap directly in each webmaster console.

Registration and sitemap submission help discovery; they do not guarantee indexing or search position. There is no need for repeated submissions or an indexing API for this small static site.

Sources: [Google verification](https://support.google.com/webmasters/answer/9008080), [sitemap submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [robots.txt location](https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt), [Bing verification and import](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b).
