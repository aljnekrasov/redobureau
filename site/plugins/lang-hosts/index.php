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
      $external = option('site.externalLanguages', []);
      $url = $this->url($code);

      if (isset($external[$code])) {
        $path = parse_url($url, PHP_URL_PATH) ?? '';
        return rtrim($external[$code], '/') . $path;
      }

      return $url;
    },

  ],

]);
