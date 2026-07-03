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

  // No route blocks on .com:
  //   /ru/* stays accessible — ru-eligible visitors (phase 4) follow direct
  //   links and bookmarks. The switcher just hides the RU button by default.

  // sync-to-ru (phase 6): admin button to push content/ from this server
  // to redobureau.ru via rsync over SSH. Disabled by default — flip
  // 'enabled' to true and fill in 'sshKey' once the .ru server is live
  // and the SSH key pair is provisioned.
  'rb.sync-to-ru' => [
    'enabled' => false,
    'host'    => '201.51.2.132',
    'user'    => 'deploy',
    'path'    => '/var/www/redobureau.ru/content/',
    'sshKey'  => null, // e.g. '/var/www/.ssh/id_ed25519_sync'
  ],
];
