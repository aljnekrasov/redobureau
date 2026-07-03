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
  'thumbs'    => ['driver' => 'gd', 'quality' => 80],

  // NOTE: site.activeLanguages / site.optionalLanguages are defined ONLY in
  // the per-host configs, never here. Kirby merges configs with
  // array_replace_recursive(), which merges lists INDEX-BY-INDEX — a base
  // default of ['en','ru','es'] overridden by ['ru'] would produce
  // ['ru','ru','es'], not ['ru']. Templates fall back gracefully when the
  // option is absent (e.g. on localhost).
];