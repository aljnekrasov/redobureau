
<?= js([
    assetVersioned('assets/js/balancetext.min.js'),
    assetVersioned('assets/js/index.min.js'),
    assetVersioned('assets/js/swiper.min.js'),
    ] ) ?>

<script>
// Lazy videos: grid covers render with data-src (no src), start loading
// only when scrolled near the viewport. Saves multi-MB on first paint —
// autoplay videos otherwise download in full immediately.
(function () {
    var vids = document.querySelectorAll('video[data-lazy]');
    if (!vids.length) return;
    function load(v) {
        if (!v.dataset.src) return;
        v.src = v.dataset.src;
        v.removeAttribute('data-src');
        v.load();
        if (v.play) v.play().catch(function () {});
    }
    if (!('IntersectionObserver' in window)) {
        vids.forEach(load);
        return;
    }
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) { load(e.target); io.unobserve(e.target); }
        });
    }, { rootMargin: '300px' });
    vids.forEach(function (v) { io.observe(v); });
})();
</script>
