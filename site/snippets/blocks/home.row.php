<?php
// Pre-filter: drop projects not allowed for the current host's audience,
// drop entries with no resolvable page. If the row ends up empty,
// skip rendering it entirely (no empty <div class="row"> in markup).
$entries = [];
foreach ($data->row()->toStructure() as $project) {
    $_page = $project->page()->toPage();
    if (!$_page) continue;
    if (!$_page->audienceAllows()) continue;
    $entries[] = ['project' => $project, 'page' => $_page];
}

if (empty($entries)) return;

$length = count($entries);
?>
<div class="row">
    <?php foreach ($entries as $entry) :
        $project = $entry['project'];
        $_page   = $entry['page'];
        $cover   = $_page->files()->template('previewCover')->first();
    ?>
    <?php if ($length >= 3) : ?>
    <div class="col-12 sm:col mb-20">
        <a href="<?= url($_page->url()) ?>" class="block link">
            <div class="home-cover-image">
                <?php if ($cover->type() == 'video') : ?>
                <video data-lazy data-src="<?= $cover->url() ?>" preload="none" loop muted playsinline></video>
                <?php else : ?>
                <img src="<?= $cover->resize(1200)->url() ?>"
                     srcset="<?= $cover->resize(800)->url() ?> 800w, <?= $cover->resize(1200)->url() ?> 1200w, <?= $cover->resize(1920)->url() ?> 1920w"
                     sizes="(min-width: 640px) 50vw, 100vw"
                     alt="<?= $project->title() ?>" loading="lazy">
                <?php endif ?>
            </div>
            <div class="mt-10"><?= $_page->title() ?></div>
            <?php if ($info = $_page->info()->toString()) : ?>
            <div class="fg-muted"><?= $info ?></div>
            <?php endif ?>
        </a>
    </div>
    <?php else : ?>
    <?php if ($size = $project->size()->toString()) : ?>
    <?php if ($size == 'auto') : ?>
    <?php if ($length == 1) : ?>
    <div class="col mb-20">
        <a href="<?= url($_page->url()) ?>" class="block link">
            <div class="home-cover-image">
                <?php if ($cover->type() == 'video') : ?>
                <video data-lazy data-src="<?= $cover->url() ?>" preload="none" loop muted playsinline></video>
                <?php else : ?>
                <img src="<?= $cover->resize(1920)->url() ?>"
                     srcset="<?= $cover->resize(1200)->url() ?> 1200w, <?= $cover->resize(1920)->url() ?> 1920w"
                     sizes="100vw"
                     alt="<?= $project->title() ?>" loading="lazy">
                <?php endif ?>
            </div>
            <div class="mt-10"><?= $_page->title() ?></div>
            <?php if ($info = $_page->info()->toString()) : ?>
            <div class="fg-muted"><?= $_page->info() ?></div>
            <?php endif ?>
        </a>
    </div>
    <?php else : ?>
    <div class="col-12 sm:col-6 mb-20">
        <a href="<?= url($_page->url()) ?>" class="block link">
            <div class="home-cover-image">
                <?php if ($cover->type() == 'video') : ?>
                <video data-lazy data-src="<?= $cover->url() ?>" preload="none" loop muted playsinline></video>
                <?php else : ?>
                <img src="<?= $cover->resize(1200)->url() ?>"
                     srcset="<?= $cover->resize(800)->url() ?> 800w, <?= $cover->resize(1200)->url() ?> 1200w, <?= $cover->resize(1920)->url() ?> 1920w"
                     sizes="(min-width: 640px) 50vw, 100vw"
                     alt="<?= $project->title() ?>" loading="lazy">
                <?php endif ?>
            </div>
            <div class="mt-10"><?= $_page->title() ?></div>
            <?php if ($info = $_page->info()->toString()) : ?>
            <div class="fg-muted"><?= $_page->info() ?></div>
            <?php endif ?>
        </a>
    </div>
    <?php endif ?>
    <?php elseif ($size == 'small') : ?>
    <div class="col-12 sm:col-6 md:col-3 mb-20">
        <a href="<?= url($_page->url()) ?>" class="block link">
            <div class="home-cover-image is-small">
                <?php if ($cover->type() == 'video') : ?>
                <video data-lazy data-src="<?= $cover->url() ?>" preload="none" loop muted playsinline></video>
                <?php else : ?>
                <img src="<?= $cover->resize(800)->url() ?>"
                     srcset="<?= $cover->resize(500)->url() ?> 500w, <?= $cover->resize(800)->url() ?> 800w, <?= $cover->resize(1000)->url() ?> 1000w"
                     sizes="(min-width: 768px) 25vw, 100vw"
                     alt="<?= $project->title() ?>" loading="lazy">
                <?php endif ?>
            </div>
            <div class="mt-10"><?= $_page->title() ?></div>
            <?php if ($info = $_page->info()->toString()) : ?>
            <div class="fg-muted"><?= $info ?></div>
            <?php endif ?>
        </a>
    </div>
    <?php else : ?>
    <div class="col-12 sm:col-6 md:col-9 mb-20">
        <a href="<?= url($_page->url()) ?>" class="block link">
            <div class="home-cover-image is-big">
                <?php if ($cover->type() == 'video') : ?>
                <video data-lazy data-src="<?= $cover->url() ?>" preload="none" loop muted playsinline></video>
                <?php else : ?>
                <img src="<?= $cover->resize(1200)->url() ?>"
                     srcset="<?= $cover->resize(800)->url() ?> 800w, <?= $cover->resize(1200)->url() ?> 1200w, <?= $cover->resize(1600)->url() ?> 1600w"
                     sizes="(min-width: 768px) 75vw, 100vw"
                     alt="<?= $project->title() ?>" loading="lazy">
                <?php endif ?>
            </div>
            <div class="mt-10"><?= $_page->title() ?></div>
            <?php if ($info = $_page->info()->toString()) : ?>
            <div class="fg-muted"><?= $_page->info() ?></div>
            <?php endif ?>
        </a>
    </div>
    <?php endif ?>
    <?php endif ?>
    <?php endif ?>
    <?php endforeach ?>
</div>
