<?php

// Host-specific config for redobureau.com (international site).
// Auto-loaded by Kirby on top of config.php when SERVER_NAME = redobureau.com.

return [
  // UI-visible languages on the international site.
  // RU page rendering still works (URLs like /ru/work resolve), the switcher
  // just doesn't expose RU unless ru-eligible (see plugin in phase 4).
  'site.activeLanguages' => ['en', 'es'],

  // Languages rendered in the switcher as hidden [data-optional] buttons,
  // revealed client-side for ru-eligible visitors. Languages listed in
  // neither option are not rendered at all.
  'site.optionalLanguages' => ['ru'],

  // Hard domain separation: RU lives on redobureau.ru only. The switcher's
  // RU button and hreflang tags point cross-domain (see plugins/lang-hosts).
  'site.externalLanguages' => [
    'ru' => 'https://redobureau.ru',
  ],

  // No Yandex Metrika here — Russian leakage on international.
  // (Hook up Google Analytics / Plausible later via a separate option.)
  'site.useYandex' => false,

  // Contact form — addresses for $kirby->email() inside controllers/contacts.php.
  // SMTP itself is intentionally not configured anywhere yet (user request).
  // When SMTP gets enabled, the credentials live here, not in code.
  'site.contactFrom' => 'noreply@redobureau.com',
  'site.contactTo'   => 'marina@redobureau.com',

  // Panel is administered from .com only.
  'panel' => [
    'install' => true,
  ],

  // Page cache prefix isolates entries from the .ru deploy (in case the
  // same Kirby checkout is ever shared across hosts in dev).
  'cache.pages' => [
    'active' => true,
    'prefix' => 'com',
  ],

  'routes' => [
    // Hard domain separation: the Russian version is served by
    // redobureau.ru only. Any /ru URL on .com (bookmarks, old index)
    // permanently moves to the same path on the Russian domain.
    [
      'pattern' => 'ru/(:all?)',
      'action'  => fn($path = null) => go('https://redobureau.ru/ru' . ($path ? '/' . $path : ''), 301),
    ],

    // Root: language dispatch. SEO-safe per Google's locale-adaptive
    // guidance: fires ONLY on the bare root (deep URLs always resolve
    // directly), always 302 (never 301), hreflang+x-default are in place,
    // and an explicit prior choice (langPref cookie, set by any switcher
    // click) always wins over Accept-Language.
    //
    // Dispatch by the browser's PRIMARY language (highest q-weight that we
    // recognize), not by mere presence: "en, ru;q=0.8" stays on /en,
    // "ru, en;q=0.8" goes to the Russian domain.
    [
      'pattern' => '/',
      'action'  => function () {
        // 1. Explicit previous choice wins.
        $pref = $_COOKIE['langPref'] ?? null;
        if ($pref === 'ru') return go('https://redobureau.ru/ru', 302);
        if (in_array($pref, ['en', 'es'], true)) return go('/' . $pref, 302);

        // 2. Parse Accept-Language into lang => max(q), pick best known.
        $prefs = [];
        foreach (explode(',', strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '')) as $part) {
          $bits = explode(';', trim($part));
          $code = substr(trim($bits[0]), 0, 2);
          if ($code === '' || $code === '*') continue;
          $q = 1.0;
          foreach ($bits as $b) {
            if (preg_match('/^q=([0-9.]+)$/', trim($b), $m)) $q = (float)$m[1];
          }
          $prefs[$code] = max($prefs[$code] ?? 0, $q);
        }
        arsort($prefs);

        foreach (array_keys($prefs) as $code) {
          if ($code === 'ru') return go('https://redobureau.ru/ru', 302);
          if ($code === 'es') return go('/es', 302);
          if ($code === 'en') return go('/en', 302);
        }

        // 3. Nothing recognized (bots, curl, exotic locales) → default EN.
        return go('/en', 302);
      },
    ],
  ],

  // sync-to-ru (phase 6): admin button to push content/ from this server
  // to redobureau.ru via rsync over SSH. Key pair: /var/www/.ssh/sync_ed25519
  // on this server (owned by www-data), public half authorized for
  // deploy@213.171.15.113 (deploy is in the www-data group, content dir
  // is group-writable).
  'rb.sync-to-ru' => [
    'enabled' => true,
    'host'    => '213.171.15.113',
    'user'    => 'deploy',
    'path'    => '/var/www/redobureau.ru/content/',
    'sshKey'  => '/var/www/.ssh/sync_ed25519',
  ],
];
