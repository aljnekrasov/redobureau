# Аналитика и рекламные пиксели

Вся разметка живёт в `site/snippets/analytics.php` и включается per-host
конфигами. **Пустой ID = пиксель не рендерится.** Чтобы включить платформу —
вписать ID в конфиг, задеплоить, готово.

| Хост | Платформы | Консент |
|---|---|---|
| redobureau.ru | Яндекс.Метрика (стоит, id 45804984) + VK Pixel (вписать) | уведомление о cookie, не блокирует |
| redobureau.com | GA4 + Meta Pixel + LinkedIn (все — вписать) | GDPR-баннер: маркетинг-пиксели стреляют только после Accept, GA4 до согласия работает в Consent Mode v2 (defaults=denied) |

## Куда вписывать ID

`site/config/config.redobureau.com.php`:
```php
'site.analytics' => [
  'ga4'      => 'G-XXXXXXXXXX',        // GA4 → Admin → Data Streams → Measurement ID
  'meta'     => '1234567890123456',    // Meta Events Manager → Pixel → Settings → Pixel ID
  'linkedin' => '1234567',             // LinkedIn Campaign Manager → Insight Tag → Partner ID
],
```

`site/config/config.redobureau.ru.php`:
```php
'site.analytics' => [
  'metrika' => 45804984,
  'vk'      => 'VK-RTRG-000000-XXXXX', // VK Ads → Пиксели → создать пиксель
],
```

После правки: закоммитить, `git pull` на сервере, `rm -rf site/cache/*`.

## Чеклист заведения кабинетов

**Международный (.com):**
1. Google Analytics 4 — создать property на redobureau.com → Measurement ID
2. Google Ads — связать с GA4 (Admin → Product links), импортировать аудитории
3. Meta Business Suite — Business Manager → Events Manager → создать Pixel
4. (опц.) LinkedIn Campaign Manager → Insight Tag

**Российский (.ru):**
1. Яндекс.Метрика — счётчик 45804984 уже в коде. Проверить доступ к кабинету;
   если счётчик утерян — создать новый и заменить id в конфиге
2. Яндекс.Директ — связать с Метрикой, сегменты строятся из её данных
3. VK Ads (ads.vk.com) — создать пиксель → вписать VK-RTRG-id

⚠️ Все кабинеты заводить на домены (redobureau.com / redobureau.ru), поэтому
запускать рекламу — после переключения DNS. Пиксели уже сейчас соберут
аудитории и по IP-заходам, но верификация доменов в Meta/Google требует
живой DNS + HTTPS.

## События (слой window.rbTrack)

Шлются во все подключённые синки (gtag / Метрика reachGoal / fbq trackCustom):

| Событие | Когда | Зачем |
|---|---|---|
| `project_view` (+имя проекта) | открыта страница проекта | ядро ретаргета: «смотрел портфолио» |
| `lang_switch` (+язык) | клик по кнопке языка | сегментация по языку |
| `redo_global_click` | клик «Redo Global» на .ru | русскоязычные с интересом к intl |

В Метрике под каждое событие завести Цель типа «JavaScript-событие» с
идентификатором = имени события (project_view и т.д.).

## Рецепты аудиторий для ретаргета

**Meta (после набора данных):**
- Custom Audience: All website visitors 30/90/180 дней
- Custom Audience: событие `project_view` 90 дней («тёплые» — видели работы)
- Lookalike 1–3% от project_view — холодный охват на похожих
- Исключение: посетители /contacts (уже в контакте)

**Google Ads (через GA4):**
- Аудитория «All users 30d» и «project_view 90d» → кампании Demand Gen/PMax

**Яндекс.Директ (сегменты Метрики):**
- Сегмент: визиты с целью project_view → ретаргет РСЯ
- Сегмент: 90 дней все посетители → корректировки ставок
- Look-alike через Яндекс.Аудитории на базе сегмента

**VK Ads:**
- Аудитория пикселя: все посетители 90 дней; событие project_view
- Look-alike на её основе

## GDPR / 152-ФЗ

- `.com`: до клика Accept не грузятся Meta/LinkedIn вообще; GA4 шлёт только
  cookieless-пинги (Consent Mode v2). Decline запоминается на год
  (cookie `rbConsent`). Это соответствует требованиям для EU-трафика.
- `.ru`: уведомление с кнопкой «Хорошо» — информирование по 152-ФЗ,
  Метрика работает сразу.
- Не забыть обновить Privacy Policy (файл policy в панели) упоминанием
  используемых пикселей — на обоих языках.
