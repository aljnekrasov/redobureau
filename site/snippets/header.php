<!DOCTYPE html>
<html lang="<?= $kirby->language()->code() ?>">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=Edge">

    <?= css(['assets/css/index.min.css']) ?>
    <link rel="preload" href="<?= url('assets/js/index.min.js') ?>" as="script" crossorigin="anonymous">

    <link rel="preload" href="<?= url('assets/fonts/5597801/92130cb4-d99d-43aa-a0a8-2cf4451f4d6e.woff2') ?>" as="font" crossorigin="anonymous">
    <link rel="preload" href="<?= url('assets/fonts/5597801/cf9b3e3a-e56a-428a-83f3-9cb745540375.woff') ?>" as="font" crossorigin="anonymous">

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
    $title = $page->main_title()->or($site->main_title()->or($site->title()));
    $ogtitle = $page->og_title()->or($site->og_title()->or($site->title()));
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
    <meta property="og:url" content="<?= $page->url() ?>">
    <meta property="og:site_name" content="<?= $site->url() ?>">

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

    <!-- Robots -->
    <!-- all = follow, index -->
    <meta name="robots" content="all">

    <!-- Canonical link -->
    <link rel="canonical" href="<?= $page->url() ?>">

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

    <!-- Yandex.Metrika counter -->

    <script type="text/javascript" async>
        (function(m, e, t, r, i, k, a) {
            m[i] = m[i] || function() {
                (m[i].a = m[i].a || []).push(arguments)
            };
            m[i].l = 1 * new Date();
            k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r, a.parentNode.insertBefore(
                k, a)
        })
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

        ym(45804984, "init", {
            clickmap: false,
            trackLinks: true,
            accurateTrackBounce: false,
            webvisor: false
        })
    </script>
    <noscript><img src="https://mc.yandex.ru/watch/45804984" style="position:absolute; left:-9999px;" alt="" /></noscript>
    <!-- /Yandex.Metrika counter -->

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
                        <a href="<?= url($pages->template('home')->first()->url()) ?>">
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
                        <a href="<?= $kirby->language()->url() . '' . '/contacts' ?>"><?= t('contacts') ?></a>


                    </div>
                </div>
            </div>
        </div>
    </div>