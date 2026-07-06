<?php snippet('header', [
    'noindex' => !option('site.navJournal', false),
    'pageCss' => ['assets/css/journal.css'],
]) ?>
<h1 class="vh-seo"><?= $page->title() ?></h1>

<div class="main pt-50">
    <div class="page">
        <div class="container">

            <!-- Masthead -->
            <div class="j-masthead">
                <div class="j-kicker">
                    <span><?= $site->title() ?></span>
                    <span class="a">Strategy → Idea → Design</span>
                    <span><?= date('Y') ?></span>
                </div>
                <h2 class="j-title"><?= $page->title() ?></h2>
            </div>

            <!-- Playground: little things to poke at -->
            <div class="j-play">
                <div class="j-play-head">
                    <?= t('playground') ?>
                    <span><?= t('playground_hint') ?></span>
                </div>
                <div class="j-play-row">
                    <figure class="j-toy">
                        <canvas data-play="liquid"></canvas>
                        <figcaption>Liquid 001 <span>— <?= t('playground_follow') ?></span></figcaption>
                    </figure>
                    <figure class="j-toy">
                        <canvas data-play="strata"></canvas>
                        <figcaption>Strata 002 <span>— <?= t('playground_touch') ?></span></figcaption>
                    </figure>
                    <figure class="j-toy">
                        <canvas data-play="letters"></canvas>
                        <figcaption>Type 003 <span>— <?= t('playground_throw') ?></span></figcaption>
                    </figure>
                </div>
            </div>

            <!-- Article index -->
            <?php
            $articles = $page->children()->listed()
                ->filter(fn($p) => $p->audienceAllows())
                ->sortBy('date', 'desc')
                ->paginate(12);
            $pagination = $articles->pagination();
            $no = $pagination->total() - ($pagination->page() - 1) * $pagination->limit();
            ?>
            <div class="j-index">
                <?php foreach ($articles as $article) : ?>
                <a class="j-row" href="<?= url($article->url()) ?>">
                    <div class="j-no">
                        <b><?= str_pad($no--, 2, '0', STR_PAD_LEFT) ?></b>
                        <?= $article->date()->toDate('d.m.Y') ?>
                    </div>
                    <div>
                        <h3><?= $article->title() ?></h3>
                        <?php if ($article->intro()->isNotEmpty()) : ?>
                        <div class="j-intro"><?= $article->intro() ?></div>
                        <?php endif ?>
                    </div>
                    <div class="j-thumb">
                        <?php if ($pc = $article->files()->template('previewCover')->first()) : ?>
                            <?php if ($pc->type() == 'video') : ?>
                            <video data-lazy data-src="<?= $pc->url() ?>" preload="none" loop muted playsinline></video>
                            <?php else : ?>
                            <img src="<?= $pc->resize(600)->url() ?>" alt="<?= $article->title() ?>" loading="lazy">
                            <?php endif ?>
                        <?php endif ?>
                    </div>
                </a>
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

<script src="<?= assetVersioned('assets/js/playground.js') ?>" defer></script>
<?php snippet('footer') ?>
