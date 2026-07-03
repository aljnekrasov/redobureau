<?php snippet('header') ?>
<h1 class="vh-seo"><?= $page->title() ?></h1>

<div class="main">
    <div class="page pt-50">
        <div class="container">
            <?php foreach (page('home')->projects()->toBuilderBlocks() as $block) :
            ?>
            <?php snippet('blocks/home.' . $block->_key(), array('data' => $block))
                ?>
            <?php endforeach
            ?>
        </div>
    </div>
</div>

<?php snippet('footer') ?>