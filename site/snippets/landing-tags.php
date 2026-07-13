<?php
// Tag-filter row above the works grid. Each "filter" is actually an SEO
// landing page (wine-design, startup-design, …) — tags link there.
// $active — id of the current landing to highlight (optional).
$__tags = $site->children()->template('landing')->listed()
    ->filter(fn($l) => $l->audienceAllows());
if (!$__tags->count()) return;
?>
<div class="work-tags">
    <a href="<?= url(page('work')->url()) ?>" class="<?= ($active ?? null) ? '' : 'is-active' ?>"><?= page('work')->title() ?></a>
    <?php foreach ($__tags as $__t) : ?>
    <a href="<?= url($__t->url()) ?>" class="<?= ($active ?? null) === $__t->id() ? 'is-active' : '' ?>"><?= $__t->title() ?></a>
    <?php endforeach ?>
</div>
<script>
/* Cursor spotlight inside the pills (meduza-style): a radial glow
   follows the pointer via --mx/--my, CSS does the rest. */
document.querySelectorAll('.work-tags a').forEach(function (a) {
    a.addEventListener('pointermove', function (e) {
        var r = a.getBoundingClientRect();
        a.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        a.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
});
</script>
