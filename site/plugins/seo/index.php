<?php

// seo: robots.txt, sitemap.xml, llms.txt (all host-aware) + canonical URL
// helpers. Each host advertises only its own languages and only the pages
// allowed for its audience — RU-only projects never leak into the .com
// sitemap and vice versa.

// Versioned asset URL for cache busting: ?v=<mtime> makes the month-long
// `immutable` cache header safe — any rebuild changes the URL.
function assetVersioned(string $path): string
{
    $file = kirby()->roots()->index() . '/' . $path;
    $v = is_file($file) ? filemtime($file) : null;
    return url($path) . ($v ? '?v=' . $v : '');
}

Kirby::plugin('rb/seo', [

    'pageMethods' => [

        /**
         * Canonical absolute URL for this page in the given language.
         * Local languages use site.canonicalBase (the real domain, even
         * when browsing by IP before DNS switch); languages hosted on the
         * other domain use their site.externalLanguages entry.
         */
        'canonicalUrl' => function (?string $code = null) {
            $code = $code ?? kirby()->language()->code();
            $path = parse_url($this->url($code), PHP_URL_PATH) ?? '';
            // Root languages live at the bare root of their host:
            // the EN home is https://redobureau.com/, not /en.
            if ($this->isHomePage() && (option('site.langRoots')[$code] ?? false)) {
                $path = '/';
            }
            $external = option('site.externalLanguages', []);
            $base = $external[$code] ?? option('site.canonicalBase');
            return $base ? rtrim($base, '/') . $path : $this->url($code);
        },

    ],

    'routes' => [

        [
            'pattern' => 'robots.txt',
            'action'  => function () {
                $base = rtrim(option('site.canonicalBase', url()), '/');
                $body = implode("\n", [
                    'User-agent: *',
                    'Disallow: /panel',
                    'Disallow: /sync-to-ru',
                    'Allow: /',
                    '',
                    '# AI crawlers are welcome — being quotable is marketing.',
                    'User-agent: GPTBot',
                    'Allow: /',
                    'User-agent: ClaudeBot',
                    'Allow: /',
                    'User-agent: PerplexityBot',
                    'Allow: /',
                    'User-agent: Google-Extended',
                    'Allow: /',
                    '',
                    'Sitemap: ' . $base . '/sitemap.xml',
                    '',
                ]);
                return new Kirby\Http\Response($body, 'text/plain', 200);
            },
        ],

        [
            'pattern' => 'sitemap.xml',
            'action'  => function () {
                $kirby = kirby();
                $langs = option('site.activeLanguages', [$kirby->defaultLanguage()->code()]);
                $skipTemplates = ['error', 'presentation', 'presentations', 'inbox', 'orders', 'order'];
                // Hidden sections stay out of the sitemap until launched.
                if (!option('site.navJournal', false)) {
                    array_push($skipTemplates, 'stories', 'story');
                }
                if (!option('site.navShop', false)) {
                    array_push($skipTemplates, 'shop', 'product');
                }

                $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
                $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

                foreach (site()->index()->listed() as $p) {
                    if (in_array($p->template()->name(), $skipTemplates, true)) continue;
                    if (!$p->audienceAllows()) continue;

                    foreach ($langs as $code) {
                        $xml .= "  <url>\n";
                        $xml .= '    <loc>' . htmlspecialchars($p->canonicalUrl($code)) . "</loc>\n";
                        $xml .= '    <lastmod>' . date('Y-m-d', $p->modified()) . "</lastmod>\n";
                        $xml .= "  </url>\n";
                    }
                }

                $xml .= '</urlset>';
                return new Kirby\Http\Response($xml, 'application/xml', 200);
            },
        ],

        [
            'pattern' => 'llms.txt',
            'action'  => function () {
                $site = site();
                $base = rtrim(option('site.canonicalBase', url()), '/');
                $langs = option('site.activeLanguages', []);
                $desc = $site->sharetext()->or($site->title());

                $lines = [
                    '# ' . $site->title(),
                    '',
                    '> ' . strip_tags($desc),
                    '',
                    '## Key pages',
                ];
                foreach ($langs as $code) {
                    $lines[] = '- ' . $base . '/' . $code . ' — home (' . $code . ')';
                    $lines[] = '- ' . $base . '/' . $code . '/work — portfolio';
                }
                if ($site->contactEmail()->isNotEmpty()) {
                    $lines[] = '';
                    $lines[] = 'Contact: ' . $site->contactEmail();
                }
                $lines[] = '';

                return new Kirby\Http\Response(implode("\n", $lines), 'text/plain', 200);
            },
        ],

    ],

]);
