<?php
// Language switcher. Renders one <a> per language available on this host.
//
// Languages in option('site.activeLanguages') are visible unconditionally.
// Languages in option('site.optionalLanguages') render with [data-optional]:
// CSS in the <head> hides them, the inline script reveals them when the
// visitor is ru-eligible (browser language or saved cookie preference).
// Installed languages listed in neither option are not rendered at all —
// on redobureau.ru (active = ['ru'], optional unset) en/es never appear,
// so the switcher collapses to a single link and renders nothing.

$current = $kirby->language() ? $kirby->language()->code() : null;
$active   = option('site.activeLanguages', [$current]);
$optCodes = option('site.optionalLanguages', []);

$primary  = [];
$optional = [];

foreach ($kirby->languages() as $lang) {
    $code = $lang->code();
    if (in_array($code, $active, true)) {
        $primary[] = $lang;
    } elseif (in_array($code, $optCodes, true)) {
        $optional[] = $lang;
    }
}

// Nothing to switch between (single-language host with no optional
// languages installed) — render nothing.
if (count($primary) + count($optional) < 2) {
    return;
}
?>
<div class="lang-switcher">
    <?php foreach ($primary as $lang) : ?>
        <a href="<?= $page->url($lang->code()) ?>"
           data-lang="<?= $lang->code() ?>"
           class="<?= $lang->code() === $current ? 'is-current' : '' ?>"><?= strtoupper($lang->code()) ?></a>
    <?php endforeach ?>
    <?php foreach ($optional as $lang) : ?>
        <a href="<?= $page->url($lang->code()) ?>"
           data-lang="<?= $lang->code() ?>"
           data-optional
           class="<?= $lang->code() === $current ? 'is-current' : '' ?>"><?= strtoupper($lang->code()) ?></a>
    <?php endforeach ?>
</div>
