<?php snippet('header', ['noindex' => !option('site.navJournal', false)]) ?>

<?php $cover = $page->files()->template('heroCover')->first(); ?>
<?php if ($cover) : ?>
<div class="hero" data-target="heroContainer">
    <div data-behavior="hero">
        <?php if ($cover->type() == 'video') : ?>
        <video src="<?= $cover->url() ?>" preload="auto" autoplay loop muted playsinline>
        <?php else : ?>
        <img src="<?= $cover->resize(2500)->url() ?>" alt="<?= $page->title() ?>">
        <?php endif ?>
    </div>
</div>
<?php endif ?>

<div class="main <?= $cover ? 'pt-20 md:pt-50' : 'pt-75 md:pt-100' ?>" data-headerBg-main>
    <div class="page">
        <div class="container">
            <div class="row mb-50">
                <div class="col-12 sm:col-8">
                    <h1 class="mb-15 extra seo-h"><?= $page->title() ?></h1>
                    <div class="fg-muted mb-25">
                        <?= $page->date()->toDate('d.m.Y') ?>
                        <?php if ($page->authors()->isNotEmpty()) : ?>
                        · <?= $page->authors() ?>
                        <?php endif ?>
                    </div>
                    <?php if ($page->intro()->isNotEmpty()) : ?>
                    <div class="mb-25"><?= $page->intro()->kt() ?></div>
                    <?php endif ?>
                </div>
            </div>

            <?php foreach ($page->body()->toBuilderBlocks() as $block) : ?>
                <?php snippet('blocks/' . $block->_key(), ['data' => $block]) ?>
            <?php endforeach ?>

            <?php $related = $page->related()->toPages(); ?>
            <?php if ($related->count()) : ?>
            <div class="row mt-100">
                <?php foreach ($related as $rel) : ?>
                <div class="col-12 sm:col-4 mb-20">
                    <a href="<?= url($rel->url()) ?>" class="block link">
                        <?php if ($rc = $rel->files()->template('previewCover')->first()) : ?>
                        <div class="home-cover-image is-small">
                            <?php if ($rc->type() == 'video') : ?>
                            <video data-lazy data-src="<?= $rc->url() ?>" preload="none" loop muted playsinline></video>
                            <?php else : ?>
                            <img src="<?= $rc->resize(800)->url() ?>" alt="<?= $rel->title() ?>" loading="lazy">
                            <?php endif ?>
                        </div>
                        <?php endif ?>
                        <div class="mt-10"><?= $rel->title() ?></div>
                    </a>
                </div>
                <?php endforeach ?>
            </div>
            <?php endif ?>
        </div>
    </div>

    <!-- NEXT STORY -->
    <?php if ($next = $page->prevListed()) : ?>
    <a href="<?= url($next->url()) ?>" class="block next-project">
        <div class="py-50">
            <div class="container">
                <div class="row">
                    <div class="col-12">
                        <div class="mb-15 text-extra"><?= $next->title() ?></div>
                        <div class="text-small fg-muted"><?= t('next_story') ?></div>
                    </div>
                </div>
            </div>
        </div>
    </a>
    <?php endif ?>

    <script type="application/ld+json">
    <?= json_encode([
        '@context'      => 'https://schema.org',
        '@type'         => 'Article',
        'headline'      => $page->title()->value(),
        'datePublished' => $page->date()->toDate('c'),
        'description'   => strip_tags($page->intro()->or($page->sharetext())->value() ?? ''),
        'author'        => ['@type' => 'Organization', 'name' => $site->title()->value()],
        'publisher'     => ['@type' => 'Organization', 'name' => $site->title()->value()],
        'image'         => ($img = $page->files()->template('previewCover')->first())
                            ? $img->resize(1200)->url() : null,
        'mainEntityOfPage' => $page->canonicalUrl(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>
    </script>
</div>

<?php snippet('footer') ?>
