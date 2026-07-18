<?php

// Host-specific config for redobureau.ru (Russian site).
// Auto-loaded by Kirby on top of config.php when SERVER_NAME = redobureau.ru.

return [
  // Audience of this host — see the note in config.redobureau.com.php.
  'site.audience' => 'ru',

  // Only Russian is exposed on this host.
  'site.activeLanguages' => ['ru'],

  // Ad & analytics pixels (see snippets/analytics.php).
  'site.analytics' => [
    'metrika' => 45804984,
    'vk'      => null, // VK Ads pixel, e.g. 'VK-RTRG-000000-XXXXX'
  ],

  // 152-ФЗ: informational cookie notice, dismissable, non-blocking.
  'site.consentBanner' => 'notice',

  // Hidden-section switches (see .com config for semantics).
  'site.navJournal' => false,
  'site.navShop'    => false,
  'site.navTools'   => true,

  // Contact form addresses. SMTP not configured yet — see note in .com config.
  'site.contactFrom' => 'noreply@redobureau.ru',
  'site.contactTo'   => 'marina@redobureau.ru',

  // Panel is fully disabled on .ru — content is edited on .com and synced
  // over (manual button, phase 6). `false` is honored by Kirby's own panel
  // route (config/routes.php: `if option('panel') === false return null`),
  // which a custom route could NOT do — system routes register before
  // custom ones, so a custom 'panel/(:all?)' route never fires.
  'panel' => false,

  'cache.pages' => [
    'active' => true,
    'prefix' => 'ru',
  ],

  // Hard domain separation: en/es live on redobureau.com. hreflang and any
  // (currently unrendered) switcher links point cross-domain.
  'site.externalLanguages' => [
    'en' => 'https://redobureau.com',
    'es' => 'https://redobureau.com',
  ],

  // "Redo Global" link in the header — the escape hatch to the
  // international site. ?setlang=en is honored SERVER-SIDE by the root
  // dispatcher on .com (sets langPref cookie before any Accept-Language
  // logic), so a russophone clicking it isn't bounced straight back.
  'site.globalLink' => 'https://redobureau.com/?setlang=en',

  // Canonical origin for SEO surfaces (canonical link, hreflang, sitemap,
  // robots, JSON-LD) — always the real domain, even when browsing by IP.
  'site.canonicalBase' => 'https://redobureau.ru',

  'site.calendlyUrl' => null,

  // Plain routes, NO 'language' key. In Kirby 3.3 a route with
  // 'language' => '*' is matched AFTER the language prefix is consumed
  // (pattern '/' would match /en/, /ru/ — never the bare root), which
  // silently disabled all three routes in the first version of this file.
  'routes' => [
    // en/es URLs permanently move to the international domain — mirror of
    // the ru/(:all?) route on .com. The bare /en goes to the .com root
    // (the EN home lives there, see site.langRoots); /es keeps its prefix.
    [
      'pattern' => 'en/(:all?)',
      'action'  => fn($path = null) => go('https://redobureau.com' . ($path ? '/en/' . $path : '/'), 301),
    ],
    [
      'pattern' => 'es/(:all?)',
      'action'  => fn($path = null) => go('https://redobureau.com/es' . ($path ? '/' . $path : ''), 301),
    ],

    // The Russian home lives at the bare root; /ru (old bookmarks,
    // internal language-root links) permanently moves to /.
    // Deep /ru/... URLs stay as-is.
    [
      'pattern' => 'ru',
      'action'  => fn() => go('/', 301),
    ],

    // Bare root renders the Russian homepage directly (200, no redirect).
    [
      'pattern' => '/',
      'action'  => fn() => site()->visit(page('home'), 'ru'),
    ],
  ],
];
