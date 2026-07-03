<?php snippet('header', ['noindex' => !option('site.navJournal', false)]) ?>
<h1 class="vh-seo"><?= $page->title() ?></h1>

<div class="main pt-75 md:pt-100">
    <div class="page">
        <div class="container">
            <?php
            $articles = $page->children()->listed()
                ->filter(fn($p) => $p->audienceAllows())
                ->sortBy('date', 'desc')
                ->paginate(12);
            $pagination = $articles->pagination();
            ?>
            <div class="row">
                <?php foreach ($articles as $article) : ?>
                <div class="col-12 sm:col-6 mb-40">
                    <a href="<?= url($article->url()) ?>" class="block link">
                        <?php if ($pc = $article->files()->template('previewCover')->first()) : ?>
                        <div class="home-cover-image">
                            <?php if ($pc->type() == 'video') : ?>
                            <video data-lazy data-src="<?= $pc->url() ?>" preload="none" loop muted playsinline></video>
                            <?php else : ?>
                            <img src="<?= $pc->resize(1200)->url() ?>"
                                 srcset="<?= $pc->resize(800)->url() ?> 800w, <?= $pc->resize(1200)->url() ?> 1200w"
                                 sizes="(min-width: 640px) 50vw, 100vw"
                                 alt="<?= $article->title() ?>" loading="lazy">
                            <?php endif ?>
                        </div>
                        <?php endif ?>
                        <div class="mt-10"><?= $article->title() ?></div>
                        <div class="fg-muted"><?= $article->date()->toDate('d.m.Y') ?></div>
                        <?php if ($article->intro()->isNotEmpty()) : ?>
                        <div class="fg-muted mt-10"><?= $article->intro() ?></div>
                        <?php endif ?>
                    </a>
                </div>
                <?php endforeach ?>
            </div>

            <?php if ($pagination->hasPages()) : ?>
            <div class="row mt-50">
                <div class="col-6">
                    <?php if ($pagination->hasPrevPage()) : ?>
                    <a href="<?= $pagination->prevPageURL() ?>">←</a>
                    <?php endif ?>
                </div>
                <div class="col-6" style="text-align:right">
                    <?php if ($pagination->hasNextPage()) : ?>
                    <a href="<?= $pagination->nextPageURL() ?>">→</a>
                    <?php endif ?>
                </div>
            </div>
            <?php endif ?>
        </div>
    </div>
</div>

<?php snippet('footer') ?>
