# Search discovery

The game uses the canonical URL `https://cgood92.github.io/super-mormon/`, the title **Super Mormon**, a search description, and a social preview. Only the game landing page belongs in the sitemap; development tools are marked `noindex`.

## Register after deployment

1. In [Google Search Console](https://search.google.com/search-console/), use the URL-prefix property `https://cgood92.github.io/super-mormon/`. A Domain property would require control of GitHub’s DNS. The owner verification tag is in `index.html`; keep it permanently. Verify after publishing.
2. Submit `https://cgood92.github.io/super-mormon/sitemap.xml` in Sitemaps, then inspect the game URL and request indexing once.
3. In [Bing Webmaster Tools](https://www.bing.com/webmasters/), import the verified Google property and sitemap, or verify the manually added URL using the Bing tag in `index.html`. Keep both verification tags permanently.

GitHub Pages serves this project below `/super-mormon/`. Its `robots.txt` is included for hosting portability, but crawlers look for `https://cgood92.github.io/robots.txt`; a file inside the project cannot control the host root. Submit the sitemap directly in each webmaster console.

Registration and sitemap submission help discovery; they do not guarantee indexing or search position. There is no need for repeated submissions or an indexing API for this small static site.

Sources: [Google verification](https://support.google.com/webmasters/answer/9008080), [sitemap submission](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [robots.txt location](https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt), [Bing verification and import](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b).
