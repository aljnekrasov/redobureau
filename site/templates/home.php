<?php snippet('header') ?>
<h1 class="vh-seo"><?= $page->title() ?></h1>

<link rel=preload as=fetch href="assets/models/13feb_two_sides.glb" crossorigin="anonymous">

<div class="push"></div>

<div class="main" id="main" class="transition-fade">
    <a href="<?= url('assets/models/redo_logo.usdz') ?>" rel="ar" class="absolute hidden">
        <img src="<?= url('assets/images/ar.svg') ?>" alt="">
    </a>
    <div id="three_root">
    </div>
    <div class="intro absolute justify-between flex-wrap flex">
        <div>
            <p class="balance-text">
                <?= $page->text_first() ?>
            </p>
        </div>
        <div>
            <p class="balance-text">
                <?= $page->text_second() ?>
            </p>
        </div>
        <?php if ($site->currentAudience() !== 'ru') : ?>
        <div style="width:100%">
            <a class="text-small" href="<?= url('/teardown/') ?>"><?= t('cta_teardown') ?></a>
        </div>
        <?php endif ?>
    </div>
</div>


<link rel="preload" as="image" href="assets/models/redo_logo.usdz">
<?php snippet('tail') ?>