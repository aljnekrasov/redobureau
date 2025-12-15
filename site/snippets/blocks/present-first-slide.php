<div class="h-screen swiper-slide">
    <div class="present-first-slide relative">
        <h1>
            <?= $page->heading() ?>
        </h1>
        <div class="absolute pin-x pin-b">
            <div class="container">
                <div class="text-small pb-10">
                    <div class="">
                        <a href="<?= url('/') ?>">Redo Bureau</a>, <?= date('Y') ?>
                        <?php if ($site->contactEmail()->isNotEmpty()) : ?>
                        <a href="mailto:<?= $site->contactEmail() ?>" class="ml-20"><?= $site->contactEmail() ?></a>
                        <?php endif ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>