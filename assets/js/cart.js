/* Cart — localStorage, no framework. Loaded on shop templates only.
   Server re-validates everything (prices come from content, never from
   the client) — this file is pure UI state. */

(function () {
  'use strict';
  var KEY = 'rbCart';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    renderBadge();
    renderPage();
  }
  function count() { return read().reduce(function (n, i) { return n + i.qty; }, 0); }

  var cart = window.rbCart = {
    items: read,
    add: function (item) {
      var items = read();
      var hit = items.find(function (i) { return i.slug === item.slug; });
      if (hit) hit.qty = Math.min(10, hit.qty + 1);
      else items.push({ slug: item.slug, title: item.title, price: +item.price,
                        currency: item.currency, img: item.img || '', qty: 1 });
      write(items);
    },
    setQty: function (slug, qty) {
      var items = read();
      items.forEach(function (i) { if (i.slug === slug) i.qty = Math.max(1, Math.min(10, qty)); });
      write(items);
    },
    remove: function (slug) {
      write(read().filter(function (i) { return i.slug !== slug; }));
    },
    clear: function () { write([]); },
  };

  function money(v, cur) {
    var sym = { usd: '$', eur: '€' }[cur] || (cur.toUpperCase() + ' ');
    return sym + (Math.round(v * 100) / 100).toLocaleString('en-US');
  }

  /* ── Floating badge ── */
  function renderBadge() {
    var el = document.querySelector('[data-cart-badge]');
    if (!el) return;
    var n = count();
    el.hidden = n === 0;
    var b = el.querySelector('b');
    if (b) b.textContent = n;
  }

  /* ── Add buttons (product page) ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-cart-add]');
    if (!btn) return;
    cart.add(btn.dataset);
    btn.textContent = btn.dataset.added || 'Added ✓';
    setTimeout(function () { btn.textContent = btn.dataset.label; }, 1400);
    if (window.rbTrack) rbTrack('add_to_cart', { product: btn.dataset.slug });
  });

  /* ── Cart page ── */
  function renderPage() {
    var root = document.querySelector('[data-cart-root]');
    if (!root) return;
    var t = JSON.parse(root.dataset.i18n);
    var items = read();

    if (!items.length) {
      root.innerHTML = '<div class="cart-empty">' + t.empty + '</div>' +
        '<a class="rb-btn rb-btn--secondary" href="' + root.dataset.shopUrl + '">' + t.toShop + '</a>';
      return;
    }

    var mixed = items.some(function (i) { return i.currency !== items[0].currency; });
    var total = items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);

    var html = '<div class="cart-list">';
    items.forEach(function (i) {
      html += '<div class="cart-row">' +
        '<img src="' + (i.img || '') + '" alt="">' +
        '<div class="t">' + i.title + '<small>' + money(i.price, i.currency) + '</small></div>' +
        '<div class="cart-qty">' +
          '<button data-dec="' + i.slug + '">−</button><span>' + i.qty + '</span>' +
          '<button data-inc="' + i.slug + '">+</button></div>' +
        '<div>' + money(i.price * i.qty, i.currency) + '</div>' +
        '<button class="cart-remove" data-rm="' + i.slug + '">' + t.remove + '</button>' +
      '</div>';
    });
    html += '</div>';
    html += '<div class="cart-total"><span>' + t.subtotal + '</span><span>' +
            (mixed ? '—' : money(total, items[0].currency)) + '</span></div>';
    html += '<div class="cart-actions">' +
            '<button class="rb-btn rb-btn--primary" data-checkout' + (mixed ? ' disabled' : '') + '>' + t.checkout + '</button>' +
            '<a class="rb-btn rb-btn--secondary" href="' + root.dataset.shopUrl + '">' + t.toShop + '</a></div>';
    if (mixed) html += '<div class="cart-error">' + t.mixed + '</div>';
    html += '<div class="cart-error" data-cart-err hidden></div>';
    root.innerHTML = html;
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.inc) cart.setQty(t.dataset.inc, qtyOf(t.dataset.inc) + 1);
    else if (t.dataset && t.dataset.dec) cart.setQty(t.dataset.dec, qtyOf(t.dataset.dec) - 1);
    else if (t.dataset && t.dataset.rm) cart.remove(t.dataset.rm);
    else if (t.closest && t.closest('[data-checkout]')) checkout(t.closest('[data-checkout]'));
  });
  function qtyOf(slug) {
    var i = read().find(function (x) { return x.slug === slug; });
    return i ? i.qty : 1;
  }

  function checkout(btn) {
    var root = document.querySelector('[data-cart-root]');
    var err = document.querySelector('[data-cart-err]');
    btn.disabled = true;
    if (window.rbTrack) rbTrack('begin_checkout', { items: count() });
    fetch(root.dataset.checkoutUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: read().map(function (i) { return { slug: i.slug, qty: i.qty }; }) }),
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j.url) { location.href = j.url; return; }
      throw new Error(j.error || 'checkout failed');
    }).catch(function (e) {
      btn.disabled = false;
      if (err) { err.textContent = e.message; err.hidden = false; }
    });
  }

  /* Arriving on the order-status page with a session id = payment done →
     the cart has been converted, clear it. */
  if (document.querySelector('[data-order-status]') && /[?&]sid=/.test(location.search)) {
    cart.clear();
  }

  renderBadge();
  renderPage();
})();
