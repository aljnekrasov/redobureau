# Многоязычная архитектура Redo Bureau

Один git-репозиторий и один кодовый артефакт обслуживают два независимых сайта:

| Сайт | Аудитория | Языки | Аналитика | Панель |
|---|---|---|---|---|
| **redobureau.com** | международная | EN (default), ES. Русского на этом домене НЕТ: `/ru/*` → 301 на redobureau.ru | без Яндекса (GA/Plausible — по желанию, пока нет) | ✅ здесь редактируется контент |
| **redobureau.ru** | российская | только RU; `/en/*`, `/es/*` → 301 на redobureau.com | Яндекс.Метрика | ❌ отключена, контент приезжает синком с .com |

**Жёсткое разделение доменов:** каждый язык живёт ровно на одном домене.
Русскоязычному посетителю .com показывается скрытая кнопка RU, но ведёт она
кросс-доменно — на `redobureau.ru` (на ту же страницу).

Ключевой принцип: **деплоится один и тот же код на оба сервера**. Всё различие
между сайтами определяется в рантайме по `SERVER_NAME` — Kirby сам подхватывает
хостовый конфиг. Ни билд-флагов, ни веток «на сайт», ни ручных правок на серверах.

---

## 1. Как Kirby хранит данные (без базы)

Kirby — file-based CMS. Вся «база» — это дерево папок `content/`:

```
content/
├── site.en.txt              ← данные уровня сайта (title, команда, соцсети) на EN
├── site.ru.txt              ← то же на RU (только отличающиеся поля)
├── home/
│   ├── home.en.txt          ← контент главной на EN
│   └── home.ru.txt          ← перевод (поля, которых нет, фолбэчатся на EN)
└── work/
    └── 1_roomp/
        ├── project.en.txt   ← текст проекта на EN
        ├── project.ru.txt   ← перевод
        └── cover.jpg        ← медиа общие для всех языков
```

- Один файл `<шаблон>.<код-языка>.txt` на язык. Языка нет — Kirby рендерит
  дефолтный (EN) для этого поля.
- Картинки/видео лежат рядом с текстом, не дублируются по языкам.
- `media/` — **кэш миниатюр**, генерится Kirby на лету, в git и бэкапы не входит.
- `content/` НЕ в git (см. `.gitignore`) — это живые данные, живут на сервере,
  бэкапятся отдельно.

## 2. Языки

Языки определяются файлами в `site/languages/` (сам факт наличия файла = язык включён):

- `en.php` — `default: true`, URL-префикс `/en`
- `ru.php` — `/ru`
- `es.php` — `/es`

Каждый файл содержит блок `translations` — UI-строки шаблонов (`t('contacts')`,
`t('brand_long')`, строки формы и т.д.). **Все языкозависимые строки в шаблонах
идут через `t(...)`, хардкодов `if ($lang == 'ru')` в коде нет** — это было
специально вычищено (фаза 1): бренд («Rb / Redo Bureau» ↔ «Редо / Студия Редо»),
«Visit website», сообщения контактной формы.

**Добавить язык** = создать `site/languages/xx.php` по образцу `es.php` +
включить его в `site.activeLanguages` нужного хостового конфига + наполнить
`content/**/*.xx.txt` переводами.

## 3. Per-host конфиги — сердце разделения

Kirby 3 автоматически грузит `site/config/config.<SERVER_NAME>.php` **поверх**
базового `site/config/config.php`:

```
site/config/
├── config.php                    ← общее: debug, thumbs, languages.detect
├── config.redobureau.com.php     ← международный сайт
└── config.redobureau.ru.php      ← русский сайт
```

Чтобы это работало, nginx-vhost передаёт PHP фактический хост:
`fastcgi_param SERVER_NAME $host;` (см. `scripts/provision.sh`).

### config.redobureau.com.php
- `site.activeLanguages => ['en','es']` — видимые языки свитчера
- `site.optionalLanguages => ['ru']` — рендерится скрытой кнопкой (см. §5)
- `site.externalLanguages => ['ru' => 'https://redobureau.ru']` — RU живёт
  на другом домене; свитчер и hreflang строят кросс-доменные ссылки
- `site.useYandex => false` — Метрика не рендерится
- `panel => ['install' => true]` — панель живёт здесь
- `cache.pages` c `prefix: 'com'`
- `routes`: `ru/(:all?)` → 301 `https://redobureau.ru/ru/<path>` (русский
  на этом домене не открывается); `/` → языковой диспетчер:
  1. кука `langPref` (явный выбор в свитчере) всегда побеждает;
  2. иначе — **основной** язык браузера по q-весам Accept-Language:
     ru → 302 на `https://redobureau.ru/ru`, es → `/es`, en → `/en`;
  3. ничего не распознано (боты, curl) → `/en`.
  SEO-безопасно по гайду Google для locale-adaptive страниц: только корень,
  только 302, hreflang+x-default на месте, явный выбор уважается. Googlebot
  краулит без русского Accept-Language → редиректа на .ru не видит.
- опции плагина `rb.sync-to-ru` (кнопка синка, по умолчанию выключена)

### config.redobureau.ru.php
- `site.activeLanguages => ['ru']`
- `site.externalLanguages => ['en' => ..., 'es' => ...]` → redobureau.com
- `site.useYandex => true`
- `panel => false` — панель отключена целиком
- `cache.pages` c `prefix: 'ru'`
- `routes`: `/` → 302 `/ru`; `en/(:all?)` и `es/(:all?)` → 301
  `https://redobureau.com/<lang>/<path>` (зеркально к .com)

### ⚠️ Три граблины Kirby 3.3.4, на которые мы наступили

1. **`array_replace_recursive` мержит списки по индексам.** Дефолт
   `['en','ru','es']` в базовом конфиге + `['ru']` в хостовом дают
   `['ru','ru','es']`, а не `['ru']`. Поэтому `site.activeLanguages`
   объявляется **только** в хостовых конфигах, в базовом её нет.
2. **Роуты с `'language' => '*'` матчатся ПОСЛЕ языкового префикса.**
   Паттерн `/` с language-скоупом ловит `/en/`, `/ru/` — но не корень сайта.
   Роуты в хостовых конфигах — обычные, без ключа `language`.
3. **Кастомный роут не может перекрыть системный роут панели** (системные
   регистрируются раньше). Отключение панели — только опцией `panel => false`,
   которую уважает сам системный роут.

## 4. Разделение проектов: поле `audience`

60% проектов общие, остальные — эксклюзив одного из рынков. Каждый проект
(блюпринт `site/blueprints/pages/project.yml`) имеет чекбоксы:

```yaml
audience:
  type: checkboxes
  options:
    intl: International (redobureau.com)
    ru: Russia (redobureau.ru)
  default: [intl, ru]
```

Плагин `site/plugins/audience/index.php` даёт два метода:

- `$site->currentAudience()` → `'ru'` если `SERVER_NAME` содержит
  `redobureau.ru`, иначе `'intl'`
- `$page->audienceAllows()` → можно ли показывать страницу на текущем хосте.
  **Пустое поле = показывать везде** — обратная совместимость: старые проекты
  без поля не выпали после деплоя.

Где применяется:
- `site/snippets/blocks/home.row.php` — лента проектов фильтруется до рендера,
  пустые ряды не рендерятся вообще;
- `site/controllers/work.php` — списки/фильтры работают по видимому набору;
- `site/controllers/project.php` — прямой URL чужого проекта отдаёт 404.

## 5. Свитчер языков и показ RU русскоязычным

Требование: международные посетители **не видят** русскую версию, но
русскоязычные (язык браузера/системы, куки выбора, российский IP) — видят.

Реализация (фаза 4), полностью кэш-дружелюбная:

1. `site/snippets/language-switcher.php` рендерит кнопки:
   - языки из `site.activeLanguages` — видимые всегда;
   - языки из `site.optionalLanguages` — с атрибутом `data-optional`;
   - остальные не рендерятся. Если кнопка одна — свитчер не рендерится
     (на .ru его нет вообще).
   URL кнопок строит `$page->crossLangUrl($code)` (плагин
   `site/plugins/lang-hosts/`): локальные языки — текущий origin (работает
   на IP/стейджинге), языки из `site.externalLanguages` — абсолютная ссылка
   на канонический домен, на ту же страницу. Кнопка RU на .com ведёт на
   `https://redobureau.ru/ru/<путь>`.
2. Inline `<style>` в `header.php`: `[data-optional] { display:none }`,
   `html.ru-eligible [data-optional] { display:inline }`.
3. Inline `<script>` там же (до paint, без FOUC): смотрит
   `navigator.languages` (ru/be/kk/ky/hy/uz/tg/az) и куку `langPref=ru` —
   если да, вешает класс `ru-eligible` на `<html>`. Клик по любой кнопке
   свитчера сохраняет `langPref` на год.
4. Серверный вариант детекта — плагин `site/plugins/ru-eligible/index.php`
   (`$site->ruEligible()`: кука + Accept-Language + заголовок Cloudflare
   `CF-IPCountry` для RU/BY/KZ/KG/AM/UZ/TJ/MD/AZ/GE). Сейчас в разметке не
   используется (JS-детекта достаточно и он не ломает page cache), оставлен
   для будущих server-side решений.

Один и тот же HTML уходит всем → page cache Kirby хранит одну версию на
(хост, язык, страницу). Персонализация — чисто CSS-классом на клиенте.

SEO: `header.php` отдаёт `<link rel="alternate" hreflang="...">` на все языки
и `x-default`, **кросс-доменно**: hreflang="ru" на .com указывает на
redobureau.ru, hreflang="en/es" на .ru — на redobureau.com. Поисковики
воспринимают два домена как языковые версии одной сущности, а не дубли.

## 6. Инфраструктура

```
                    ┌─────────────────┐
   git push ───────►│  GitHub (main)  │
                    └────────┬────────┘
                             │ GitHub Actions (.github/workflows/deploy.yml)
              ┌──────────────┴──────────────┐
              ▼ rsync                        ▼ rsync
   ┌─────────────────────┐        ┌─────────────────────┐
   │  31.97.140.210      │        │  <новый RU-сервер>  │
   │  redobureau.com     │ rsync  │  redobureau.ru      │
   │  nginx+php8.3-fpm   │──────► │  nginx+php8.3-fpm   │
   │  content/ + панель  │ content│  content/ (реплика) │
   └─────────────────────┘ (кнопка└─────────────────────┘
                            в админке)
```

- **`scripts/provision.sh [com|ru]`** — поднимает пустой Ubuntu 22.04/24.04 VPS:
  nginx, php-fpm с расширениями, certbot, юзер `deploy`, клон репы,
  runtime-папки, vhost, ufw. Vhost включает два важных нюанса:
  - `fastcgi_param SERVER_NAME $host` — для per-host конфигов;
  - `try_files $uri /index.php?$query_string` в location статики — миниатюры
    Kirby генерятся лениво при первом запросе URL, без фолбэка был бы 404.
- **`.github/workflows/deploy.yml`** — два параллельных rsync-джоба
  (push в main / ручной запуск). Джоб `.ru` включается репо-переменной
  `RU_ENABLED=true`. Секреты: `DEPLOY_{USER,HOST,PATH,SSH_KEY}_{COM,RU}`.
  `.deployignore` исключает `content/`, `media/`, `site/{cache,sessions,accounts,logs}` —
  деплой кода никогда не трогает данные.
- **`site/plugins/sync-to-ru/`** — страница `/sync-to-ru` на .com
  (только admin): кнопка «Sync now» → rsync `content/` на .ru по SSH.
  Выключена защёлкой `rb.sync-to-ru.enabled` в конфиге .com, включается после
  провижининга RU-сервера (+ путь к SSH-ключу в `sshKey`).
- **`scripts/smoke-test.sh [com|ru|both]`** — curl-проверки поведения
  после деплоя (статусы, редиректы, Метрика, hreflang, свитчер).

### Приём: тестировать .ru без RU-сервера

nginx на .com — implicit default для любых Host. Запрос
`curl -H "Host: redobureau.ru" http://31.97.140.210/...` заставляет Kirby
загрузить `config.redobureau.ru.php` — полная симуляция русского сайта на
международном сервере. Так были найдены все три граблины из §3.

## 7. Текущий статус (июль 2026)

- ✅ `.com` задеплоен на `31.97.140.210`: контент (1.28 ГБ) и аккаунты панели
  перенесены со старого Hostinger, все страницы/картинки работают.
- ✅ `.ru` задеплоен на `213.171.15.113`: контент реплицирован с .com,
  per-host поведение проверено (редиректы, Метрика, панель отключена).
- ✅ Sync-кнопка включена: `https://redobureau.com/sync-to-ru` (нужен
  admin-логин в панель), rsync под ключом `www-data` → `deploy@.ru`.
- ⏳ DNS обоих доменов ещё указывает на старые адреса — переключение
  A-записей (для .com через Cloudflare proxied) + certbot на каждом сервере.
- ⏳ GitHub Actions: секреты не заведены, деплой пока ручным `git pull`
  на серверах; `RU_ENABLED=true` выставить вместе с секретами.
- 💤 SMTP-формы намеренно не настроены (отправка закомментирована на фронте);
  адреса берутся из `site.contactFrom/contactTo` хостовых конфигов, когда
  дойдут руки.
- 🇪🇸 Испанские переводы UI-строк готовы (`es.php`), контентные `*.es.txt`
  добавляются редакторами по мере готовности (без них поля фолбэчатся на EN).

## 8. Шпаргалка редактора

- **Проект только для России:** в панели на .com в проекте снять галку
  `International`, оставить `Russia` → на .com проект исчезает из ленты и
  отдаёт 404 по прямой ссылке; на .ru — виден (после синка).
- **Залить изменения на .ru:** открыть `https://redobureau.com/sync-to-ru`,
  нажать «Sync now», дождаться зелёного «sync ok».
- **Новый язык интерфейса:** `site/languages/xx.php` (копия `es.php` с
  переводами) + добавить `'xx'` в `site.activeLanguages` конфига .com.
