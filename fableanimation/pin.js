import { WORKS, shuffled } from "./moodworks.js"

// Pin 075: the Pinterest funnel. One page, two jobs. Outbound: every work
// is a vertical card with a Pin button, so the whole portfolio can be
// seeded to Pinterest in minutes — each pin links back HERE with a deep
// link + UTM. Inbound: a visitor who clicks a pin lands on exactly the
// work they saved (spotlight), and the page works to keep them: booking a
// call, Instagram, Telegram, likes, share, exit-intent, timed nudge —
// ten hooks, all wired to a dataLayer for analytics.

// ---- config: replace with the real links before publishing --------------------

const LINKS = {
  call: "https://cal.com/redobureau/intro", // TODO: реальная ссылка на Calendly/cal.com
  instagram: "https://instagram.com/redobureau", // TODO: реальный аккаунт
  telegram: "https://t.me/redobureau", // TODO: реальный канал
}

// canonical page URL used inside pins; in production this page's public URL
const PAGE_URL = location.origin + location.pathname

const NAMES = {
  centaurasingularity: "Centaura Singularity",
  "dv-capital": "DV Capital",
  "faberlic-bioglow": "Faberlic Bioglow",
  "faberlic-masks": "Faberlic Masks",
  "keep-looking": "Keep Looking",
  "lure-oysters": "Lure Oysters",
  "mail-ru": "Mail.ru",
  move: "Move",
  "nude-stories": "Nude Stories",
  "ob-edinenie-love-gentle-union": "Объединение",
  petnat: "Petnat",
  roomp: "Roomp",
  "ub-design": "UB Design",
  "uppa-winery": "Uppa Winery",
  "uppa-winery-reimagining-the-classic-line": "Uppa Winery — Classic Line",
}
const nameOf = w => NAMES[w.slug] || w.slug

// ---- hook 3: UTM persistence ---------------------------------------------------
// Метки из пина сохраняются и подмешиваются в букинг-ссылку и в каждое событие
// аналитики: лид, пришедший из Pinterest, остаётся помеченным до конверсии.

const params = new URLSearchParams(location.search)
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
const incoming = {}
UTM_KEYS.forEach(k => {
  if (params.get(k)) incoming[k] = params.get(k)
})
if (Object.keys(incoming).length) localStorage.setItem("redo_utm", JSON.stringify(incoming))
const UTM = JSON.parse(localStorage.getItem("redo_utm") || "{}")

function withUtm(url) {
  try {
    const u = new URL(url)
    Object.entries(UTM).forEach(([k, v]) => u.searchParams.set(k, v))
    return u.toString()
  } catch {
    return url
  }
}

// ---- analytics stub (dataLayer) — потом подхватят GTM/Метрика -------------------

function track(event, data = {}) {
  ;(window.dataLayer = window.dataLayer || []).push({ event, ...data, ...UTM })
}
track("page_view", { works: WORKS.length })

// ---- wire every CTA (hooks 4, 9 и все кнопки call/ig/tg) ------------------------

function wireCtas(root = document) {
  root.querySelectorAll("[data-cta]").forEach(a => {
    const kind = a.dataset.cta
    a.href = kind === "call" ? withUtm(LINKS.call) : LINKS[kind] || "#"
    a.target = "_blank"
    a.rel = "noopener"
    if (!a.dataset.wired) {
      a.dataset.wired = "1"
      a.addEventListener("click", () => track("cta_click", { cta: kind, place: a.dataset.place }))
    }
  })
}

// ---- hook 1: pin publisher -------------------------------------------------------
// Кнопка Pin открывает композер Pinterest: media = картинка работы,
// url = эта же страница с deep-link ?w= и полным набором UTM.

function pinComposerUrl(idx) {
  const w = ORDER[idx]
  const target = new URL(PAGE_URL)
  target.searchParams.set("w", String(idx))
  target.searchParams.set("utm_source", "pinterest")
  target.searchParams.set("utm_medium", "pin")
  target.searchParams.set("utm_campaign", "portfolio")
  target.searchParams.set("utm_content", w.slug)
  const media = new URL(w.src, location.href).toString()
  const desc = `Redo Bureau — ${nameOf(w)}. Брендинг и digital.`
  return (
    "https://www.pinterest.com/pin/create/button/?url=" +
    encodeURIComponent(target.toString()) +
    "&media=" +
    encodeURIComponent(media) +
    "&description=" +
    encodeURIComponent(desc)
  )
}

function openPin(idx) {
  track("pin_click", { work: ORDER[idx].slug })
  open(pinComposerUrl(idx), "_blank", "noopener,width=760,height=640")
}

// ---- hook 10: share with deep link ----------------------------------------------

async function shareWork(idx) {
  const w = ORDER[idx]
  const u = new URL(PAGE_URL)
  u.searchParams.set("w", String(idx))
  u.searchParams.set("utm_source", "share")
  u.searchParams.set("utm_medium", "visitor")
  u.searchParams.set("utm_content", w.slug)
  const link = u.toString()
  track("share", { work: w.slug })
  if (navigator.share) {
    try {
      await navigator.share({ title: `Redo — ${nameOf(w)}`, url: link })
      return
    } catch {}
  }
  try {
    await navigator.clipboard.writeText(link)
    toast("Ссылка скопирована — можно отправлять")
  } catch {
    prompt("Скопируйте ссылку:", link)
  }
}

// ---- hook 8: likes → telegram magnet ----------------------------------------------

const likes = new Set(JSON.parse(localStorage.getItem("redo_likes") || "[]"))
let likePromptShown = sessionStorage.getItem("redo_like_prompt") === "1"

function toggleLike(idx, chip) {
  const slug = ORDER[idx].slug + "#" + idx
  if (likes.has(slug)) likes.delete(slug)
  else likes.add(slug)
  localStorage.setItem("redo_likes", JSON.stringify([...likes]))
  chip.classList.toggle("liked", likes.has(slug))
  chip.textContent = likes.has(slug) ? "♥" : "♡"
  updateLikeCount()
  track("like", { work: ORDER[idx].slug, total: likes.size })
  if (likes.size >= 3 && !likePromptShown) {
    likePromptShown = true
    sessionStorage.setItem("redo_like_prompt", "1")
    toast(`Уже ${likes.size} работы в подборке. Такие разборы — у нас в Telegram`, [
      { label: "Подписаться", cta: "telegram", place: "like_magnet" },
    ])
  }
}

function updateLikeCount() {
  document.getElementById("likecount").textContent = likes.size ? `♥ ${likes.size}` : ""
}

// ---- build the masonry -------------------------------------------------------------

const grid = document.getElementById("grid")
const ORDER = shuffled(WORKS, 77)
const ASPECTS = ["2 / 3", "3 / 4", "4 / 5"]

function ctaCard(kind) {
  const el = document.createElement("div")
  el.className = "card cta" + (kind === "tg" ? " tg" : "")
  if (kind === "call") {
    // hook 5: нативная конверсионная карточка среди работ
    el.innerHTML = `
      <h3>Нравится уровень?</h3>
      <p>Разберём вашу задачу и прикинем решение — 15 минут, бесплатно.</p>
      <a class="btn" data-cta="call" data-place="grid_inline" href="#">Забукать звонок</a>`
  } else {
    el.innerHTML = `
      <h3>Процесс и до/после</h3>
      <p>Разборы этих кейсов, черновики и цифры — в нашем Telegram.</p>
      <a class="btn" data-cta="telegram" data-place="grid_inline" href="#">Подписаться</a>`
  }
  return el
}

ORDER.forEach((w, i) => {
  const card = document.createElement("div")
  card.className = "card"
  card.style.aspectRatio = ASPECTS[i % ASPECTS.length]
  card.dataset.idx = i

  const img = new Image()
  img.src = w.src
  img.alt = nameOf(w)
  img.loading = "lazy"
  img.decoding = "async"
  card.appendChild(img)

  const veil = document.createElement("div")
  veil.className = "veil"
  veil.innerHTML = `
    <div class="top-row">
      <button class="chip pin" data-act="pin">Pin</button>
    </div>
    <div class="bottom-row">
      <span class="name"></span>
      <span style="display:flex;gap:8px">
        <button class="chip" data-act="share">↗</button>
        <button class="chip" data-act="like">♡</button>
      </span>
    </div>`
  veil.querySelector(".name").textContent = nameOf(w)
  card.appendChild(veil)

  card.addEventListener("click", e => {
    const act = e.target.dataset && e.target.dataset.act
    if (act === "pin") {
      e.stopPropagation()
      openPin(i)
    } else if (act === "share") {
      e.stopPropagation()
      shareWork(i)
    } else if (act === "like") {
      e.stopPropagation()
      toggleLike(i, e.target)
    } else {
      openSpot(i)
    }
  })

  grid.appendChild(card)

  // hook 5: конверсионные карточки вшиты в поток работ
  if (i === 7) grid.appendChild(ctaCard("call"))
  if (i === 19) grid.appendChild(ctaCard("tg"))
})

// ---- hook 9: instagram strip ---------------------------------------------------------

const igthumbs = document.getElementById("igthumbs")
shuffled(WORKS, 9)
  .slice(0, 12)
  .forEach(w => {
    const a = document.createElement("a")
    a.href = LINKS.instagram
    a.target = "_blank"
    a.rel = "noopener"
    a.addEventListener("click", () => track("cta_click", { cta: "instagram", place: "igstrip_thumb" }))
    const img = new Image()
    img.src = w.src
    img.alt = ""
    img.loading = "lazy"
    a.appendChild(img)
    igthumbs.appendChild(a)
  })

// ---- hook 2: deep-link spotlight -----------------------------------------------------

const spot = document.getElementById("spot")
const spotImg = document.getElementById("spotImg")
const spotName = document.getElementById("spotName")
const spotLike = document.getElementById("spotLike")
let spotIdx = -1

function openSpot(idx) {
  spotIdx = ((idx % ORDER.length) + ORDER.length) % ORDER.length
  const w = ORDER[spotIdx]
  spotImg.src = w.src
  spotName.textContent = nameOf(w)
  const liked = likes.has(w.slug + "#" + spotIdx)
  spotLike.textContent = liked ? "♥" : "♡"
  spotLike.classList.toggle("liked", liked)
  spot.classList.add("on")
  const u = new URL(location.href)
  u.searchParams.set("w", String(spotIdx))
  history.replaceState(null, "", u)
  track("spotlight_open", { work: w.slug })
}

function closeSpot() {
  spot.classList.remove("on")
  const u = new URL(location.href)
  u.searchParams.delete("w")
  history.replaceState(null, "", u)
}

spot.addEventListener("click", e => {
  if (e.target === spot) closeSpot()
})
document.getElementById("prevW").addEventListener("click", () => openSpot(spotIdx - 1))
document.getElementById("nextW").addEventListener("click", () => openSpot(spotIdx + 1))
document.getElementById("spotPin").addEventListener("click", () => openPin(spotIdx))
document.getElementById("spotShare").addEventListener("click", () => shareWork(spotIdx))
spotLike.addEventListener("click", () => toggleLike(spotIdx, spotLike))
addEventListener("keydown", e => {
  if (!spot.classList.contains("on")) return
  if (e.key === "Escape") closeSpot()
  if (e.key === "ArrowLeft") openSpot(spotIdx - 1)
  if (e.key === "ArrowRight") openSpot(spotIdx + 1)
})

// пришли с пина → сразу показываем ту самую работу
if (params.has("w")) {
  const idx = parseInt(params.get("w"), 10)
  if (!isNaN(idx) && idx >= 0 && idx < ORDER.length) {
    track("pin_landing", { work: ORDER[idx].slug })
    setTimeout(() => openSpot(idx), 350)
  }
}

// ---- hook 4: sticky bar ----------------------------------------------------------------

const sticky = document.getElementById("sticky")
addEventListener("scroll", () => {
  sticky.classList.toggle("on", scrollY > 420)
}, { passive: true })

// ---- hook 6: exit intent ----------------------------------------------------------------

const exitOverlay = document.getElementById("exit")
document.addEventListener("mouseout", e => {
  if (e.relatedTarget || e.clientY > 8) return
  if (sessionStorage.getItem("redo_exit") === "1") return
  if (spot.classList.contains("on")) return
  sessionStorage.setItem("redo_exit", "1")
  exitOverlay.classList.add("on")
  track("exit_modal_shown")
})
exitOverlay.addEventListener("click", e => {
  if (e.target === exitOverlay) exitOverlay.classList.remove("on")
})

// ---- hook 7: timed nudge -----------------------------------------------------------------

const toastEl = document.getElementById("toast")
let toastTimer

function toast(text, actions = []) {
  clearTimeout(toastTimer)
  toastEl.innerHTML = ""
  const span = document.createElement("div")
  span.textContent = text
  toastEl.appendChild(span)
  if (actions.length) {
    const row = document.createElement("div")
    row.className = "row"
    actions.forEach(a => {
      const btn = document.createElement("a")
      btn.className = "btn"
      btn.textContent = a.label
      btn.dataset.cta = a.cta
      btn.dataset.place = a.place
      row.appendChild(btn)
    })
    const later = document.createElement("button")
    later.className = "later"
    later.textContent = "позже"
    later.addEventListener("click", () => toastEl.classList.remove("on"))
    row.appendChild(later)
    toastEl.appendChild(row)
    wireCtas(toastEl)
  }
  toastEl.classList.add("on")
  track("toast_shown", { text: text.slice(0, 40) })
  if (!actions.length) toastTimer = setTimeout(() => toastEl.classList.remove("on"), 3200)
}

if (sessionStorage.getItem("redo_nudge") !== "1") {
  setTimeout(() => {
    if (exitOverlay.classList.contains("on") || spot.classList.contains("on")) return
    sessionStorage.setItem("redo_nudge", "1")
    toast("Мы сейчас онлайн — можем разобрать вашу задачу сегодня", [
      { label: "Выбрать время", cta: "call", place: "nudge" },
    ])
  }, 25000)
}

// ---- go ------------------------------------------------------------------------------------

wireCtas()
updateLikeCount()
