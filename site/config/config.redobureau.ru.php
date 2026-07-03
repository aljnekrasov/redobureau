<?php

// Host-specific config for redobureau.ru (Russian site).
// Auto-loaded by Kirby on top of config.php when SERVER_NAME = redobureau.ru.

return [
  // Only Russian is exposed on this host.
  'site.activeLanguages' => ['ru'],

  // Yandex Metrika stays on the Russian site.
  'site.useYandex' => true,

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

  // Plain routes, NO 'language' key. In Kirby 3.3 a route with
  // 'language' => '*' is matched AFTER the language prefix is consumed
  // (pattern '/' would match /en/, /ru/ — never the bare root), which
  // silently disabled all three routes in the first version of this file.
  'routes' => [
    // Bookmarks / SEO leftovers in en/es get a permanent redirect home.
    [
      'pattern' => 'en/(:all?)',
      'action'  => fn() => go('/ru', 301),
    ],
    [
      'pattern' => 'es/(:all?)',
      'action'  => fn() => go('/ru', 301),
    ],

    // Root URL redirects to /ru — ru is the only language here, but the URL
    // prefix /ru is kept globally consistent across both deploys (so internal
    // links built with $kirby->language()->url() always resolve).
    [
      'pattern' => '/',
      'action'  => fn() => go('/ru', 302),
    ],
  ],
];
