<!DOCTYPE html>
<html lang="<?= $kirby->language()->code() ?>">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=Edge">

    <?= css([assetVersioned('assets/css/index.min.css')]) ?>
    <link rel="preload" href="<?= assetVersioned('assets/js/index.min.js') ?>" as="script" crossorigin="anonymous">

    <!-- woff2 only: preloading the .woff fallback made every browser
         download both formats — modern browsers never use the .woff. -->
    <link rel="preload" href="<?= url('assets/fonts/5597801/92130cb4-d99d-43aa-a0a8-2cf4451f4d6e.woff2') ?>" as="font" type="font/woff2" crossorigin="anonymous">

    <!-- 

    ██████╗ ███████╗██████╗  ██████╗                  
    ██╔══██╗██╔════╝██╔══██╗██╔═══██╗                 
    ██████╔╝█████╗  ██║  ██║██║   ██║                 
    ██╔══██╗██╔══╝  ██║  ██║██║   ██║                 
    ██║  ██║███████╗██████╔╝╚██████╔╝                 
    ╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝                  
                                                    
    ██████╗ ██╗   ██╗██████╗ ███████╗ █████╗ ██╗   ██╗
    ██╔══██╗██║   ██║██╔══██╗██╔════╝██╔══██╗██║   ██║
    ██████╔╝██║   ██║██████╔╝█████╗  ███████║██║   ██║
    ██╔══██╗██║   ██║██╔══██╗██╔══╝  ██╔══██║██║   ██║
    ██████╔╝╚██████╔╝██║  ██║███████╗██║  ██║╚██████╔╝
    ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ 
                                                    

     -->

    <?php
    $shareimg;
    // Per-page titles: "Work — Redo Bureau", "Roomp — Redo Bureau", …
    // The home page keeps the bare site title. main_title (panel field)
    // still wins when editors set it explicitly.
    $brand = $site->title();
    if ($page->isHomePage()) {
        $title = $page->main_title()->or($site->main_title()->or($brand));
    } else {
        $title = $page->main_title()->or($page->title()) . ' — ' . $brand;
    }
    $ogtitle = $page->og_title()->or($site->og_title()->or($title));
    $description = $page->sharetext()->or($site->sharetext()->or(''));

    if ($page->files()->template('share')->first()) {
        $shareimg = $page->files()->template('share')->first()->url();
    } elseif ($site->files()->template('share')->first()) {
        $shareimg = $site->files()->template('share')->first()->url();
    } else {
        $shareimg = false;
    }
    ?>

    <title><?= $title ?></title>

    <meta name="description" content="<?= $description ?>">

    <meta property="og:type" content="website">
    <meta property="og:title" content="<?= $ogtitle ?>">
    <meta property="og:description" content="<?= $description ?>">
    <meta property="og:url" content="<?= $page->canonicalUrl() ?>">
    <meta property="og:site_name" content="<?= $site->title() ?>">

    <?php if ($shareimg) : ?>
        <meta property="og:image" content="<?= $shareimg ?>">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
    <?php endif ?>

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= $ogtitle ?>">
    <meta name="twitter:description" content="<?= $description ?>">

    <?php if ($shareimg) : ?>
        <meta name="twitter:image" content="<?= $shareimg ?>">
    <?php endif ?>

    <!-- Robots: templates of hidden sections (journal/shop before launch)
         pass noindex via snippet('header', ['noindex' => true]) -->
    <meta name="robots" content="<?= ($noindex ?? false) ? 'noindex, nofollow' : 'all' ?>">

    <!-- Canonical link — always the real domain, never the IP. -->
    <link rel="canonical" href="<?= $page->canonicalUrl() ?>">

    <!-- hreflang: cross-domain — every language version points to its
         canonical domain (RU lives on redobureau.ru, EN/ES on .com), so
         search engines treat the two sites as language variants of one
         entity instead of duplicate content. -->
    <?php foreach ($kirby->languages() as $_lang) : ?>
    <link rel="alternate" hreflang="<?= $_lang->code() ?>" href="<?= $page->canonicalUrl($_lang->code()) ?>">
    <?php endforeach ?>
    <link rel="alternate" hreflang="x-default" href="<?= $page->canonicalUrl($kirby->defaultLanguage()->code()) ?>">

    <!-- Structured data: machine-readable identity for search and
         generative engines (who we are, where, links to profiles). -->
    <script type="application/ld+json">
    <?= json_encode([
        '@context'    => 'https://schema.org',
        '@type'       => 'Organization',
        'name'        => $site->title()->value(),
        'url'         => rtrim(option('site.canonicalBase', $site->url()), '/'),
        'logo'        => rtrim(option('site.canonicalBase', $site->url()), '/') . '/assets/icons/icon-192.png',
        'description' => strip_tags($description),
        'sameAs'      => array_values(array_filter(array_map(
            fn($l) => $l->url()->value(),
            $site->socialLinks()->toStructure()->data()
        ))),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>
    </script>

    <!-- Remove auto-formatting for telephone numbers -->
    <meta name="format-detection" content="telephone=no">

    <meta name="copyright" content="(c) <?= date('Y') ?> <?= $site->title() ?>">

    <meta name="apple-mobile-web-app-title" content="<?= $site->title() ?>">

    <!-- Icons -->
    <!-- 1: .png - 64x64 -->
    <!-- 2: .png - 192x192 -->
    <link rel="icon" type="image/png" href="<?= url('assets/icons/icon-64.png') ?>"><!-- 1 -->
    <link rel="apple-touch-icon" type="image/png" sizes="192x192" href="<?= url('assets/icons/icon-192.png') ?>">
    <!-- 2 -->

    <?php snippet('analytics') ?>

    <!-- Language switcher: optional buttons (RU on .com) hidden by default.
         The inline script below adds .ru-eligible to <html> when the visitor
         is likely a russophone (browser language or saved preference); CSS
         then shows the RU button. Page cache stays cache-friendly — one HTML
         per (host, language, page); the per-visitor reveal is purely CSS. -->
    <style>
        .lang-switcher [data-optional] { display: none; }
        html.ru-eligible .lang-switcher [data-optional] { display: inline; }
    </style>
    <script>
    (function () {
        var d = document;
        var navLangs = ((navigator.languages || [navigator.language || '']).join(',') || '').toLowerCase();
        var hasRuLang = /\b(ru|be|kk|ky|hy|uz|tg|az)\b/.test(navLangs);
        var hasRuCookie = d.cookie.indexOf('langPref=ru') !== -1;
        if (hasRuLang || hasRuCookie) {
            d.documentElement.classList.add('ru-eligible');
        }
        // Persist explicit choice on switcher click for next visits.
        d.addEventListener('click', function (e) {
            var t = e.target && e.target.closest && e.target.closest('[data-lang]');
            if (!t) return;
            d.cookie = 'langPref=' + t.dataset.lang + ';path=/;max-age=31536000;samesite=lax';
        });
        // ?setlang=xx — arriving from the other domain (e.g. "Redo Global"
        // on redobureau.ru): persist the choice so the root dispatcher
        // doesn't bounce this visitor back, then clean the URL.
        var m = location.search.match(/[?&]setlang=(en|es|ru)\b/);
        if (m) {
            d.cookie = 'langPref=' + m[1] + ';path=/;max-age=31536000;samesite=lax';
            if (history.replaceState) {
                history.replaceState(null, '', location.pathname + location.hash);
            }
        }
    })();
    </script>

</head>

<body class="<?= $page->template() ?>">

    <div hidden>
        <?= snippet('sprites') ?>
    </div>

    <div data-message-target></div>

    <div class="header">
        <div class="background" data-behavior="headerBg"></div>
        <div class="container">
            <div class="body">
                <div class="row">
                    <div class="col-3 sm:col logotype">
                        <?php /* Logo goes to the bare root: the host's root
                               language renders there; es-visitors get
                               re-dispatched to /es by the root route. */ ?>
                        <a href="<?= url('/') ?>">
                            <span class="sm:hidden"><?= t('brand_short') ?></span>
                            <span class="hidden sm:inline"><?= t('brand_long') ?></span>
                        </a>
                    </div>
                    <div class="col-9 sm:col nav">
                        <a href="<?= url(page('work')->url()) ?>">
                            <?= page('work')->title() ?>
                        </a>
                        <a href="<?= url($pages->template('studio')->first()->url()) ?>">
                            <?= $pages->template('studio')->first()->title() ?>
                        </a>
                        <?php if (option('site.navJournal', false) && ($journal = page('journal'))) : ?>
                        <a href="<?= url($journal->url()) ?>"><?= $journal->title() ?></a>
                        <?php endif ?>
                        <?php if (option('site.navShop', false) && ($shop = page('shop'))) : ?>
                        <a href="<?= url($shop->url()) ?>"><?= $shop->title() ?></a>
                        <?php endif ?>
                        <a href="<?= $kirby->language()->url() . '' . '/contacts' ?>"><?= t('contacts') ?></a>
                        <?php snippet('language-switcher') ?>
                        <?php if ($globalLink = option('site.globalLink')) : ?>
                        <a href="<?= $globalLink ?>" rel="noopener">Redo Global</a>
                        <?php endif ?>
                    </div>
                </div>
            </div>
        </div>
    </div>