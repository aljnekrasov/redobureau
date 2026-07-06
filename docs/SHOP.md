# Shop — устройство и запуск

Kirby-магазин, ≤20 товаров, Stripe Checkout (один товар, без корзины).
Скрыт флагом `site.navShop` (nav + sitemap + noindex) до запуска.

## Архитектура

```
Покупатель                      Stripe                    Сервер .com
    │  Buy (POST /shop/checkout)  │                           │
    ├─────────────────────────────┼──────────────────────────►│ создаёт Checkout Session
    │◄─── 303 redirect ───────────┤◄──────────────────────────┤ (curl, без SDK)
    │  платит на stripe.com       │                           │
    │◄─── back: ?paid=1 ──────────┤                           │
    │                             │  checkout.session.completed
    │                             ├──────────────────────────►│ POST /shop/webhook:
    │                             │◄───────── 200 ────────────┤ подпись → заказ в панель →
    │                             │                           │ quantity-- → soldout при 0 →
    │                             │                           │ email (когда будет SMTP)
```

- **Заказы** — страницы в `content/orders/` (панель → Orders): статус
  paid/shipped/done/refunded, покупатель, адрес доставки, сумма, заметки.
  С фронта весь раздел /orders* отдаёт 404.
- **Инвентарь**: поле Quantity у товара. Пусто = не отслеживается.
  Каждый оплаченный заказ списывает 1; на нуле товар сам становится
  Sold out (и в панели, и на витрине).
- **Идемпотентность**: один заказ на session id — ретраи Stripe безопасны.
- **Цены**: intl из `price`+`currency` (USD/EUR), на .ru показывается
  `price_rub` и кнопка «Заказать по почте» (Stripe в РФ не работает;
  ЮKassa — этап V2+).
- **Доставка**: Stripe собирает адрес (список стран в
  `site.shopShipping.allowed_countries`) и добавляет flat-rate из
  `site.shopShipping.flat[валюта]` (minor units).
- **Налоги**: `site.shopStripeTax => true` ТОЛЬКО после включения
  Stripe Tax в дашборде.

## Чеклист запуска (по порядку)

1. **Stripe аккаунт** → Developers → API keys → Secret key:
   ```
   echo 'sk_live_…' | sudo tee /var/www/.stripe-secret
   sudo chown root:www-data /var/www/.stripe-secret && sudo chmod 640 /var/www/.stripe-secret
   ```
   С этого момента кнопки Buy — живые платежи.
2. **Webhook**: Dashboard → Developers → Webhooks → Add endpoint →
   URL `https://redobureau.com/shop/webhook`, событие
   `checkout.session.completed` → скопировать Signing secret:
   ```
   echo 'whsec_…' | sudo tee /var/www/.stripe-webhook-secret
   sudo chown root:www-data /var/www/.stripe-webhook-secret && sudo chmod 640 /var/www/.stripe-webhook-secret
   ```
   (до переключения DNS Stripe не сможет достучаться до вебхука —
   этот шаг после DNS+TLS; заказы в дашборде Stripe видны и без него)
3. Тестовый режим: те же два файла с `sk_test_…`/`whsec_…` тестовыми,
   карта 4242 4242 4242 4242.
4. Поправить ставки доставки (`site.shopShipping.flat`) и цены товаров
   в панели.
5. Фото товаров: панель → Shop → товар → Preview cover + Gallery.
6. **Запуск**: `site.navShop => true` в конфиге .com (и/или .ru) →
   git pull → раздел в шапке, uindex снят, sitemap пополнен.

## Диагностика

- `site/logs/stripe.log` — ошибки создания сессий и вебхука.
- Webhook отвечает: 503 без секрета, 400 при плохой подписи,
  200 `{"received":true}` при успехе, `duplicate:true` на ретрае.
- Письма-нотификации молча пропускаются до настройки SMTP (ошибка
  пишется в лог) — заказ при этом сохраняется всегда.

## Дальше (по мере надобности)

- **V3 корзина**: localStorage + несколько line_items в той же сессии —
  делать, когда в заказах появятся реальные покупки 2+ позиций.
- **V4 ЮKassa для .ru**: создание платежа + webhook (схема зеркальна
  Stripe), 54-ФЗ чеки через облачную кассу ЮKassa, оферта/доставка/
  возвраты страницами.
- Триггер ухода на платформу (Shopify): >100 заказов/мес или нужен
  3PL-фулфилмент.
