<?php
// Language switcher. Renders one <a> per language available on this host.
//
// Languages in option('site.activeLanguages') are visible unconditionally.
// Other installed Kirby languages render with [data-optional]; CSS in the
// <head> hides them, the inline script in <head> reveals them when the
// visitor is ru-eligible (Accept-Language, cookie, or .ru-eligible class
// added server-side via $site->ruEligible()).
//
// On redobureau.ru, activeLanguages = ['ru'] and there are no other
// installed languages reachable (en/es get 301'd to /ru by the routes
// in config.redobureau.ru.php), so this snippet renders effectively
// nothing user-facing.

$current = $kirby->language() ? $kirby->language()->code() : null;
$active  = option('site.activeLanguages', [$current]);

$primary  = [];
$optional = [];

foreach ($kirby->languages() as $lang) {
    $code = $lang->code();
    if (in_array($code, $active, true)) {
        $primary[] = $lang;
    } else {
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
