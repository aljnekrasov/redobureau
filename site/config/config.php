<?php

// Base config, shared by both redobureau.com and redobureau.ru.
// Host-specific overrides live in:
//   site/config/config.redobureau.com.php
//   site/config/config.redobureau.ru.php
// Kirby auto-loads the matching one based on $_SERVER['SERVER_NAME'].

return [
  'debug'     => false,
  'languages' => [
    'detect' => true,
  ],
  'thumbs'    => ['driver' => 'gd'],

  // Default list of UI-visible languages. Per-host configs override this:
  //   .com -> ['en', 'es']  (ru shown only to ru-eligible visitors via plugin)
  //   .ru  -> ['ru']
  'site.activeLanguages' => ['en', 'ru', 'es'],
];