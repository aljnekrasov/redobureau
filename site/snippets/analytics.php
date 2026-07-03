<?php
// Analytics & ad pixels — fully config-driven, host-aware.
//
// Per-host config supplies option('site.analytics') with the IDs this host
// uses; a missing/null ID means the pixel is not rendered at all:
//   .ru:  ['metrika' => 45804984, 'vk' => 'VK-RTRG-…']
//   .com: ['ga4' => 'G-…', 'meta' => '…', 'linkedin' => '…']
//
// option('site.consentBanner'):
//   'gdpr'   — .com: nothing marketing fires before Accept. GA4 loads with
//              Consent Mode v2 defaults=denied (cookieless pings only) and
//              upgrades on Accept; Meta/LinkedIn are injected only after
//              Accept. Decline is remembered for a year.
//   'notice' — .ru: pixels fire immediately, a dismissable cookie notice
//              is shown (152-ФЗ information duty).
//   false    — no banner, pixels fire immediately (dev).
//
// Also emits a tiny event layer (window.rbTrack) used for audience
// building: project_view, lang_switch, redo_global_click. Events fan out
// to whichever sinks are present (gtag / ym / fbq / VK auto-collects).

$a       = option('site.analytics', []);
$ga4     = $a['ga4']      ?? null;
$meta    = $a['meta']     ?? null;
$li      = $a['linkedin'] ?? null;
$metrika = $a['metrika']  ?? null;
$vk      = $a['vk']       ?? null;
$consent = option('site.consentBanner', false);
$gdpr    = $consent === 'gdpr';

// Nothing configured and no banner needed — render nothing at all.
if (!$ga4 && !$meta && !$li && !$metrika && !$vk && !$consent) return;
?>

<?php if ($ga4) : ?>
<!-- GA4 (Consent Mode v2: defaults denied under gdpr, upgraded on Accept) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=<?= $ga4 ?>"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
<?php if ($gdpr) : ?>
gtag('consent', 'default', {
    ad_storage: 'denied', ad_user_data: 'denied',
    ad_personalization: 'denied', analytics_storage: 'denied'
});
<?php endif ?>
gtag('js', new Date());
gtag('config', '<?= $ga4 ?>');
</script>
<?php endif ?>

<?php if ($metrika) : ?>
<!-- Yandex.Metrika -->
<script type="text/javascript" async>
(function(m, e, t, r, i, k, a) {
    m[i] = m[i] || function() { (m[i].a = m[i].a || []).push(arguments) };
    m[i].l = 1 * new Date();
    k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1,
    k.src = r, a.parentNode.insertBefore(k, a)
})(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(<?= $metrika ?>, "init", {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false
});
</script>
<noscript><img src="https://mc.yandex.ru/watch/<?= $metrika ?>" style="position:absolute; left:-9999px;" alt="" /></noscript>
<?php endif ?>

<?php if ($vk) : ?>
<!-- VK Pixel (VK Ads / myTarget retargeting) -->
<script type="text/javascript">
(function(w, d) {
    w.VK = w.VK || {}; VK.Retargeting = VK.Retargeting || {};
    var s = d.createElement("script"); s.async = true;
    s.src = "https://vk.com/js/api/openapi.js?169";
    s.onload = function() { VK.Retargeting.Init("<?= $vk ?>"); VK.Retargeting.Hit(); };
    d.head.appendChild(s);
})(window, document);
</script>
<noscript><img src="https://vk.com/rtrg?p=<?= $vk ?>" style="position:absolute; left:-9999px;" alt="" /></noscript>
<?php endif ?>

<script>
// ── Consent + deferred marketing pixels + event layer ──
(function () {
    var d = document;
    var GDPR = <?= $gdpr ? 'true' : 'false' ?>;
    var NOTICE = <?= $consent === 'notice' ? 'true' : 'false' ?>;
    var META_ID = <?= json_encode($meta) ?>;
    var LI_ID = <?= json_encode($li) ?>;
    var YM_ID = <?= json_encode($metrika) ?>;

    function getConsent() {
        var m = d.cookie.match(/(?:^|;\s*)rbConsent=([a-z-]+)/);
        return m ? m[1] : null;
    }
    function setConsent(v) {
        d.cookie = 'rbConsent=' + v + ';path=/;max-age=31536000;samesite=lax';
    }

    // Marketing pixels injected only when allowed (immediately without
    // gdpr mode, after Accept with it).
    var marketingLoaded = false;
    function loadMarketing() {
        if (marketingLoaded) return;
        marketingLoaded = true;
        if (window.gtag) {
            gtag('consent', 'update', {
                ad_storage: 'granted', ad_user_data: 'granted',
                ad_personalization: 'granted', analytics_storage: 'granted'
            });
        }
        if (META_ID) {
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', META_ID);
            fbq('track', 'PageView');
        }
        if (LI_ID) {
            window._linkedin_partner_id = LI_ID;
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
            window._linkedin_data_partner_ids.push(LI_ID);
            var s = d.createElement('script'); s.async = true;
            s.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
            d.head.appendChild(s);
        }
    }

    // ── Banner ──
    var stored = getConsent();
    if (GDPR) {
        if (stored === 'granted') loadMarketing();
        else if (stored !== 'denied') showBanner(true);
    } else {
        loadMarketing();
        if (NOTICE && stored !== 'noticed') showBanner(false);
    }

    function showBanner(withChoice) {
        var bar = d.createElement('div');
        bar.className = 'cookie-bar';
        bar.innerHTML = '<span>' + <?= json_encode(t('cookie_text')) ?> + '</span>' +
            (withChoice
                ? '<button data-consent="granted">' + <?= json_encode(t('cookie_accept')) ?> + '</button>' +
                  '<button data-consent="denied" class="is-muted">' + <?= json_encode(t('cookie_decline')) ?> + '</button>'
                : '<button data-consent="noticed">' + <?= json_encode(t('cookie_ok')) ?> + '</button>');
        bar.addEventListener('click', function (e) {
            var b = e.target.closest('[data-consent]');
            if (!b) return;
            setConsent(b.dataset.consent);
            if (b.dataset.consent === 'granted') loadMarketing();
            bar.remove();
        });
        if (d.body) d.body.appendChild(bar);
        else d.addEventListener('DOMContentLoaded', function () { d.body.appendChild(bar); });
    }

    // ── Event layer: fan out to whatever sinks exist ──
    window.rbTrack = function (name, params) {
        params = params || {};
        try {
            if (window.gtag) gtag('event', name, params);
            if (window.ym && YM_ID) ym(YM_ID, 'reachGoal', name, params);
            if (window.fbq) fbq('trackCustom', name, params);
        } catch (e) {}
    };

    // Template-level view events — retargeting signals.
    // body class is exactly the template name (see header.php).
    var tpl = d.body ? d.body.className : '';
    if (tpl === 'project' || tpl === 'story' || tpl === 'product') {
        var h1 = d.querySelector('h1');
        rbTrack(tpl + '_view', { title: h1 ? h1.textContent.trim() : location.pathname });
    }
    // language switches and the escape hatches between domains
    d.addEventListener('click', function (e) {
        var t;
        if ((t = e.target.closest && e.target.closest('[data-lang]'))) {
            rbTrack('lang_switch', { to: t.dataset.lang });
        } else if ((t = e.target.closest && e.target.closest('a')) && /redobureau\.com\/en\?setlang/.test(t.href)) {
            rbTrack('redo_global_click', {});
        }
    });
})();
</script>

<style>
.cookie-bar{position:fixed;left:15px;bottom:15px;right:15px;z-index:9999;display:flex;align-items:center;gap:14px;flex-wrap:wrap;max-width:480px;padding:14px 18px;background:#111;color:#fff;font-size:13px;line-height:1.4}
.cookie-bar button{font:inherit;color:#111;background:#fff;border:0;padding:6px 14px;cursor:pointer}
.cookie-bar button.is-muted{background:transparent;color:#888;text-decoration:underline;padding:6px 4px}
</style>
