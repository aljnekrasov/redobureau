<?php snippet('header') ?>

<?php
// Industry landing: query copy → matching projects → matching articles →
// book-a-call CTA. Projects match ANY of the selected industries/types.
$inds  = $page->content('en')->get('pull_industries')->split();
$types = $page->content('en')->get('pull_types')->split();
$projects = page('work')->children()->listed()
    ->filter(fn($p) => $p->audienceAllows())
    ->filter(function ($p) use ($inds, $types) {
        return array_intersect($inds, $p->content('en')->get('industry')->split())
            || array_intersect($types, $p->content('en')->get('types')->split());
    });

$topics = $page->topics()->split();
$stories = ($j = page('journal'))
    ? $j->children()->listed()
        ->filter(fn($s) => $s->audienceAllows())
        ->filter(fn($s) => !$topics || array_intersect($topics, $s->types()->split()))
        ->sortBy('date', 'desc')->limit(3)
    : null;

$calendly = option('site.calendlyUrl');
$ctaHref  = $calendly ?: 'mailto:' . $site->contactEmail() . '?subject=' . rawurlencode('Intro call — ' . $page->title());
?>

<?php /* Wrapper mirrors work.php exactly (main → page pt-50 → container)
         so the tag row sits at the SAME position on /work and on every
         landing — no jumping while "filtering". Tags always first. */ ?>
<div class="main">
    <div class="page pt-50">
        <div class="container">
            <?php snippet('landing-tags', ['active' => $page->id()]) ?>

            <div class="row mb-50">
                <div class="col-12 sm:col-8">
                    <h1 class="mb-25 extra seo-h"><?= $page->title() ?></h1>
                    <?= $page->intro()->kt() ?>
                </div>
            </div>

            <?php if ($projects->count()) : ?>
            <div class="case-label mb-25"><?= t('landing_work') ?></div>
            <div class="row">
                <?php foreach ($projects as $pr) : ?>
                <div class="col-12 sm:col-6 md:col-4 mb-40">
                    <a href="<?= url($pr->url()) ?>" class="block link">
                        <?php if ($pc = $pr->files()->template('previewCover')->first()) : ?>
                        <div class="home-cover-image">
                            <?php if ($pc->type() == 'video') : ?>
                            <video data-lazy data-src="<?= $pc->url() ?>" preload="none" loop muted playsinline></video>
                            <?php else : ?>
                            <img src="<?= $pc->resize(1000)->url() ?>" alt="<?= $pr->title() ?>" loading="lazy">
                            <?php endif ?>
                        </div>
                        <?php endif ?>
                        <div class="mt-10"><?= $pr->title() ?></div>
                        <?php if ($info = $pr->info()->toString()) : ?>
                        <div class="fg-muted"><?= $info ?></div>
                        <?php endif ?>
                    </a>
                </div>
                <?php endforeach ?>
            </div>
            <?php endif ?>

            <?php if ($stories && $stories->count()) : ?>
            <div class="case-label mb-25 mt-50"><?= t('landing_reading') ?></div>
            <div class="row mb-50">
                <?php foreach ($stories as $st) : ?>
                <div class="col-12 sm:col-4 mb-20">
                    <a href="<?= url($st->url()) ?>" class="block link">
                        <div><?= $st->title() ?></div>
                        <div class="fg-muted text-small"><?= $st->date()->toDate('d.m.Y') ?></div>
                    </a>
                </div>
                <?php endforeach ?>
            </div>
            <?php endif ?>
        </div>
    </div>

    <!-- Book a call -->
    <a href="<?= $ctaHref ?>" class="block next-project" <?= $calendly ? 'rel="noopener" target="_blank"' : '' ?>>
        <div class="py-50">
            <div class="container">
                <div class="row"><div class="col-12">
                    <div class="mb-15 text-extra"><?= t('landing_cta') ?></div>
                    <div class="text-small fg-muted"><?= t('landing_cta_sub') ?></div>
                </div></div>
            </div>
        </div>
    </a>
</div>

<?php snippet('footer') ?>
