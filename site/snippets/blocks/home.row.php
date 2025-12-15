<div class="row">
    <?php foreach ($data->row()->toStructure() as $project) : ?>
    <?php if ($_page = $project->page()->toPage()) : ?>
    <?php
      $cover = $_page->files()->template('previewCover')->first();
      $length = $data->row()->toStructure()->count()
      ?>
    <?php if ($length >= 3) : ?>
    <div class="col-12 sm:col mb-20">
        <a href="<?= url($_page->url()) ?>" class="block link">
            <div class="home-cover-image">
                <?php if ($cover->type() == 'video') : ?>
                <video src="<?= $cover->url() ?>" preload="auto" autoplay loop muted playsinline />
                <?php else : ?>
                <img src="<?= $cover->resize(1920)->url() ?>" alt="<?= $project->title() ?>">
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
                <video src="<?= $cover->url() ?>" preload="auto" autoplay loop muted playsinline />
                <?php else : ?>
                <img src="<?= $cover->resize(1920)->url() ?>" alt="<?= $project->title() ?>">
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
                <video src="<?= $cover->url() ?>" preload="auto" autoplay loop muted playsinline />
                <?php else : ?>
                <img src="<?= $cover->resize(1920)->url() ?>" alt="<?= $project->title() ?>">
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
                <video src="<?= $cover->url() ?>" preload="auto" autoplay loop muted playsinline />
                <?php else : ?>
                <img src="<?= $cover->resize(1000)->url() ?>" alt="<?= $project->title() ?>">
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
                <video src="<?= $cover->url() ?>" preload="auto" autoplay loop muted playsinline />
                <?php else : ?>
                <img src="<?= $cover->resize(1600)->url() ?>" alt="<?= $project->title() ?>">
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
    <?php endif ?>
    <?php endforeach ?>
</div>