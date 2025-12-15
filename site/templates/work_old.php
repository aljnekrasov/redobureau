<?php snippet('header') ?>
<div class="main pt-75 md:pt-100" id="swup" class="transition-fade">
    <div class="page">
        <div class="container">
            <div class="filters">
                <div class="filters-row">
                    <div class="filters-col flex mr-20 sm:mr-50" data-behavior="dropdown">
                        <button class="link" data-ref="dropdown.trigger" data-target-id="type"><?= $type ?></button>
                        <div class="py-75 md:py-100 overflow-auto dropdown" data-ref="dropdown.body" id="type" hidden>
                            <div class="container">
                                <div class="dropdown-body">
                                    <div class="dropdown-buttons text-normal flex">
                                        <button class="link mr-20 sm:mr-50" data-ref="dropdown.trigger"
                                            data-target-id="type"><?= $type ?></button>
                                        <button class="link" data-ref="dropdown.trigger"
                                            data-target-id="industry"><?= $industry ?></button>
                                    </div>
                                    <?php foreach ($site->worktypes()->toStructure() as $item) : ?>
                                    <a href="?q=<?= Escape::url($item->name()) ?>" data-no-swup
                                        class="filters-item"><?= $item->name() ?></a>
                                    <?php endforeach ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="filters-col flex" data-behavior="dropdown">
                        <button class="link" data-ref="dropdown.trigger"
                            data-target-id="industry"><?= $industry ?></button>
                        <div class="py-75 md:py-100 overflow-auto dropdown" data-ref="dropdown.body" id="industry"
                            hidden>
                            <div class="container">
                                <div class="dropdown-body">
                                    <div class="dropdown-buttons text-normal flex">
                                        <button class="link mr-20 sm:mr-50" data-ref="dropdown.trigger"
                                            data-target-id="type"><?= $type ?></button>
                                        <button class="link" data-ref="dropdown.trigger"
                                            data-target-id="industry"><?= $industry ?></button>
                                    </div>
                                    <?php foreach ($site->industries()->toStructure() as $item) : ?>
                                    <a href="?q=<?= Escape::url($item->name()) ?>" data-no-swup
                                        class="filters-item"><?= $item->name() ?></a>
                                    <?php endforeach ?>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="work row">
                <?php foreach ($projects as $project) : ?>
                <div class="col-12 sm:col-6 md:col-4 mb-20">
                    <a href="<?= $project->url() ?>" class="link">
                        <div data-img-wrapper>
                            <?php if ($cover = $project->files()->template('previewCover')->first()) : ?>
                            <?php if ($cover->type() == 'video') : ?>
                            <video src="<?= $cover->url() ?>" preload="auto" autoplay muted loop
                                playsinline>
                                <?php else : ?>
                                <img src="<?= $cover->resize(800)->url() ?>" alt="<?= $project->title() ?>">
                                <?php endif ?>
                                <?php endif ?>
                        </div>
                        <div class="mt-10"><?= $project->title() ?></div>
                        <?php if ($info = $project->info()->toString()) : ?>
                        <div class="fg-muted"><?= $info ?></div>
                        <?php endif ?>
                    </a>
                </div>
                <?php endforeach ?>
            </div>
        </div>
    </div>
</div>
<?php snippet('footer') ?>