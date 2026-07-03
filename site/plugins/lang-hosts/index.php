<?php

// lang-hosts: hard domain separation between the two sites.
//
// Each host config declares which languages live on the OTHER domain via
// 'site.externalLanguages' => ['ru' => 'https://redobureau.ru', ...].
// $page->crossLangUrl($code) then builds the correct absolute URL:
// local languages keep the current origin (works on IPs / staging),
// external ones get their canonical domain.
//
// Used by the language switcher and the hreflang tags in header.php.

Kirby::plugin('rb/lang-hosts', [

  'pageMethods' => [

    'crossLangUrl' => function (string $code) {
      // Root languages live at the bare root of their host (see
      // site.langRoots in config.php) — the home switcher links go to /
      // instead of /en (or the .ru root instead of /ru).
      $isRootHome = $this->isHomePage() && (option('site.langRoots')[$code] ?? false);
      $external   = option('site.externalLanguages', []);

      if (isset($external[$code])) {
        $path = $isRootHome ? '/' : (parse_url($this->url($code), PHP_URL_PATH) ?? '');
        return rtrim($external[$code], '/') . $path;
      }

      return $isRootHome ? url('/') : $this->url($code);
    },

  ],

]);
