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

  // Panel is disabled on .ru — content is edited on .com and synced over
  // (manual button, phase 6).
  'panel' => [
    'install' => false,
  ],

  'cache.pages' => [
    'active' => true,
    'prefix' => 'ru',
  ],

  'routes' => [
    // Block panel access entirely.
    [
      'pattern'  => 'panel/(:all?)',
      'language' => '*',
      'action'   => fn() => site()->errorPage()->render(),
    ],

    // Bookmarks / SEO leftovers in en/es get a permanent redirect home.
    // Going to /ru (root of the active language) rather than guessing slugs.
    [
      'pattern'  => ['en/(:all?)', 'es/(:all?)'],
      'language' => '*',
      'action'   => fn() => go('/ru', 301),
    ],

    // Root URL redirects to /ru — ru is the only language here, but the URL
    // prefix /ru is kept globally consistent across both deploys (so internal
    // links built with $kirby->language()->url() always resolve).
    [
      'pattern'  => '/',
      'language' => '*',
      'action'   => fn() => go('/ru', 302),
    ],
  ],
];
