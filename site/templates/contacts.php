<?php snippet('header', ['isBlack' => true]) ?>
<div class="main pt-75 md:pt-100" id="swup" class="transition-fade">
    <div class="page">
        <div class="container">
            <div class="row">
                <!--<div class="col-12 sm:col-6">-->
                <!--    <form action="<?= $page->url() ?>" method="POST" data-behavior="contactForm">-->
                <!--        <div class="contact-form row">-->
                <!--            <div class="col-12">-->
                <!--                <input class="field" name="email" type="text" placeholder="<?= t('form_input') ?>">-->
                <!--            </div>-->
                <!--            <div class="col-12 mt-20 relative">-->
                <!--                <textarea class="textarea" name="message" id="" cols="30" rows="6" placeholder="<?= t('form_message') ?>"></textarea>-->
                <!--                <button class="link submit"><?= t('form_submit') ?></button>-->
                <!--            </div>-->
                <!--        </div>-->
                <!--    </form>-->
                <!--</div>-->
                <div class="col-12 sm:col-6 mt-40 sm:mt-0">
                    <div class="row">
                        <?php if ($site->contactsAdditional()->isNotEmpty()) : ?>
                            <?php foreach ($site->contactsAdditional()->toStructure() as $item) : ?>
                                <div class="col-6 lg:col-5 mb-40">
                                    <div><?= $item->title() ?></div>
                                    <?php if ($item->mail()->isNotEmpty()) : ?>
                                        <div class="truncate"><a href="mailto:<?= $item->mail() ?>"><?= $item->mail() ?></a></div>
                                    <?php endif ?>
                                    <?php if ($item->phone()->isNotEmpty()) : ?>
                                        <div class="truncate"><a href="tel:<?= $item->phone() ?>"><?= $item->phone() ?></a></div>
                                    <?php endif ?>
                                </div>
                            <?php endforeach ?>
                        <?php endif ?>
                    </div>
                </div>
            </div>
        </div>
        <?php if ($site->contactLat()->isNotEmpty() && $site->contactLong()->isNotEmpty()) : ?>
            <div class="map sm:mt-40" data-behavior="contactMap" data-contactMap-lat="<?= $site->contactLat() ?>" data-contactMap-long="<?= $site->contactLong() ?>"></div>
        <?php endif ?>
    </div>
</div>

<script type="text/javascript" defer src='https://maps.googleapis.com/maps/api/js?key=AIzaSyCrQRORmEBYrcXOmvLZHjs8uJH6xi1D-WE'></script>

<?php snippet('footer') ?>