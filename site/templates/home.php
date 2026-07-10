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
        <div style="width:100%">
            <span class="text-small fg-muted"><?= t('geo_line') ?></span>
            <?php if ($site->currentAudience() !== 'ru') : ?>
            <a class="text-small" style="margin-left:14px" href="<?= url('/teardown/') ?>"><?= t('cta_teardown') ?></a>
            <?php endif ?>
            <div class="text-small" style="margin-top:8px">
                <?php $__ls = $site->children()->template('landing')->listed()->filter(fn($l) => $l->audienceAllows()); ?>
                <?php foreach ($__ls as $__i => $__l) : ?><a href="<?= url($__l->url()) ?>"><?= $__l->title() ?></a><?php if ($__l !== $__ls->last()) : ?> · <?php endif ?><?php endforeach ?>
            </div>
        </div>
    </div>
</div>


<link rel="preload" as="image" href="assets/models/redo_logo.usdz">
<?php snippet('tail') ?>