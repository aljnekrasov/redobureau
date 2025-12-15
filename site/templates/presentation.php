<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=Edge">

    <title><?= $site->title() ?></title>

    <meta name="copyright" content="(c) <?= date('Y') ?> <?= $site->title() ?>">

    <!-- Robots -->
    <!-- all = noindex, nofollow -->
    <meta name="robots" content="none">

    <!-- Icons -->
    <!-- 1: .png - 64x64 -->
    <!-- 2: .png - 192x192 -->
    <link rel="icon" type="image/png" href="<?= url('assets/icons/icon-64.png') ?>"><!-- 1 -->
    <link rel="apple-touch-icon" type="image/png" sizes="192x192" href="<?= url('assets/icons/icon-192.png') ?>">
    <!-- 2 -->

    <link rel="preload" href="<?= url('assets/fonts/HelveticaNeueCyr-Bold.woff2') ?>" as="font" crossorigin="anonymous">
    <link rel="preload" href="<?= url('assets/fonts/HelveticaNeueCyr-Bold.woff') ?>" as="font" crossorigin="anonymous">
    <link rel="preload" href="<?= url('assets/fonts/HelveticaNeueCyr-Roman.woff2') ?>" as="font"
        crossorigin="anonymous">
    <link rel="preload" href="<?= url('assets/fonts/HelveticaNeueCyr-Bold.woff') ?>" as="font" crossorigin="anonymous">

    <!--[if lt IE 9]>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html5shiv/3.7.3/html5shiv.min.js"></script>
  <![endif]-->

    <?= css([
    'https://cdnjs.cloudflare.com/ajax/libs/Swiper/4.5.0/css/swiper.min.css',
    'assets/css/index.min.css'
  ]) ?>

</head>

<body>

    <div class="h-screen present">
        <div class="h-screen swiper-container present-slider" id="presentation">
            <div class="h-screen swiper-wrapper">
                <?php snippet('blocks/present-first-slide') ?>
                <?php foreach ($page->files() as $file) : ?>
                <div class="h-screen swiper-slide">
                    <?
            switch ($file->type()) {
              case "image":
                echo '<img class="present-slider-img" src="' . $file->url() . '">';
                break;
              case "video":
                echo '<video src="' . $file->url() . '" alt="" playsinline loop autoplay muted type="video/mp4" />';
                break;
              default:
                echo '<img class="present-slider-img" src="' . $file->url() . '">';
                break;
            }
            ?>
                </div>
                <?php endforeach ?>
                <?php snippet('blocks/present-last-slide') ?>

            </div>
            <div class="present-slider-pagination text-small"></div>
        </div>
    </div>

    <?= js([
    'https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver%2CIntersectionObserverEntry%2CMutationObserver',
    'https://cdnjs.cloudflare.com/ajax/libs/Swiper/4.5.0/js/swiper.min.js',
    'assets/js/presentation.min.js'
  ]) ?>
</body>

</html>