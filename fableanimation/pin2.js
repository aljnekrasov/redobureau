import { WORKS, REDUCED, rng, shuffled, onViewport } from "./moodworks.js"

// Pin2 076: the creative funnel. Same job as pin.html — publish works to
// Pinterest, catch the returning traffic — but the conversion lives INSIDE
// the animation instead of on top of it. The portfolio is an endless
// draggable table (the Galds mechanic); the call-to-action is a black card
// lying among the prints, Instagram is a stack of polaroids, Telegram is a
// paper plane circling the table. The exit-intent parts the prints, the
// timed nudge flips one of them over like a playing card, and likes fly
// into a pile that offers itself to Telegram.

// ---- config: replace before publishing ------------------------------------------

const LINKS = {
  call: "https://cal.com/redobureau/intro", // TODO: реальный букинг
  instagram: "https://instagram.com/redobureau", // TODO
  telegram: "https://t.me/redobureau", // TODO
}
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

// ---- utm + analytics --------------------------------------------------------------

const params = new URLSearchParams(location.search)
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
const incoming = {}
UTM_KEYS.forEach(k => params.get(k) && (incoming[k] = params.get(k)))
if (Object.keys(incoming).length) localStorage.setItem("redo_utm", JSON.stringify(incoming))
const UTM = JSON.parse(localStorage.getItem("redo_utm") || "{}")

const track = (event, data = {}) =>
  (window.dataLayer = window.dataLayer || []).push({ event, ...data, ...UTM })
track("page_view", { page: "pin2" })

function withUtm(url) {
  try {
    const u = new URL(url)
    Object.entries(UTM).forEach(([k, v]) => u.searchParams.set(k, v))
    return u.toString()
  } catch {
    return url
  }
}

function wireCtas(root = document) {
  root.querySelectorAll("[data-cta]").forEach(a => {
    const kind = a.dataset.cta
    a.href = kind === "call" ? withUtm(LINKS.call) : LINKS[kind] || "#"
    a.target = "_blank"
    a.rel = "noopener"
    if (!a.dataset.wired) {
      a.dataset.wired = "1"
      a.addEventListener("click", e => {
        e.stopPropagation()
        track("cta_click", { cta: kind, place: a.dataset.place })
      })
    }
  })
}

// ---- pinterest / share -------------------------------------------------------------

function pinComposerUrl(idx) {
  const w = ORDER[idx]
  const target = new URL(PAGE_URL)
  target.searchParams.set("w", String(idx))
  target.searchParams.set("utm_source", "pinterest")
  target.searchParams.set("utm_medium", "pin")
  target.searchParams.set("utm_campaign", "portfolio")
  target.searchParams.set("utm_content", w.slug)
  const media = new URL(w.src, location.href).toString()
  return (
    "https://www.pinterest.com/pin/create/button/?url=" +
    encodeURIComponent(target.toString()) +
    "&media=" +
    encodeURIComponent(media) +
    "&description=" +
    encodeURIComponent(`Redo Bureau — ${nameOf(w)}. Брендинг и digital.`)
  )
}

function openPin(idx) {
  track("pin_click", { work: ORDER[idx].slug })
  open(pinComposerUrl(idx), "_blank", "noopener,width=760,height=640")
}

async function shareWork(idx) {
  const w = ORDER[idx]
  const u = new URL(PAGE_URL)
  u.searchParams.set("w", String(idx))
  u.searchParams.set("utm_source", "share")
  u.searchParams.set("utm_medium", "visitor")
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

// ---- the table ----------------------------------------------------------------------

const stage = document.getElementById("stage")
const ORDER = shuffled(WORKS, 81)

let vw = innerWidth
let vh = innerHeight
let bw = 0
let bh = 0
let panX = 0
let panY = 0
let velX = 0
let velY = 0
let tmx = 0
let tmy = 0
let mx = 0
let my = 0
let dragging = false
let dragMoved = 0
let lastX = 0
let lastY = 0
let lastT = 0
let idle = 99
let t = 0
let scatterK = 0 // exit-intent раздвигает стол
let scatterT = 0

let items = [] // { el, x, y, depth, type, idx }
let plane = null

function scatter(n, r, seeds) {
  const pts = seeds.slice()
  const mX = bw * 0.1
  const mY = bh * 0.12
  const out = []
  for (let i = 0; i < n; i++) {
    let best = null
    let bestD = -1
    for (let k = 0; k < 16; k++) {
      const c = { x: mX + r() * (bw - mX * 2), y: mY + r() * (bh - mY * 2) }
      let d = Infinity
      for (const p of pts) d = Math.min(d, (p.x - c.x) ** 2 + (p.y - c.y) ** 2)
      if (d > bestD) {
        bestD = d
        best = c
      }
    }
    pts.push(best)
    out.push(best)
  }
  return out
}

function build(animate = false) {
  vw = innerWidth
  vh = innerHeight
  bw = Math.max(vw * 2.2, 2100)
  bh = Math.max(vh * 2.2, 1500)
  stage.innerHTML = ""
  items = []
  const r = rng(19)
  const base = Math.min(vw, vh)

  // спецобъекты занимают места первыми — работы рассыпаются вокруг
  const ctaPos = { x: bw / 2 + base * 0.16, y: bh / 2 + base * 0.1 }
  const igPos = { x: bw / 2 - base * 0.55, y: bh / 2 - base * 0.4 }
  const spots = scatter(ORDER.length, r, [ctaPos, igPos])

  // --- работы ---
  ORDER.forEach((work, i) => {
    const depth = 0.82 + r() * 0.36
    const spot = document.createElement("div")
    spot.className = "spot"
    spot.style.setProperty("--z", 1 + Math.round(depth * 40))

    let w = base * (0.2 + r() * 0.14)
    if (work.ratio < 1) w *= 0.7
    if (work.ratio > 2.4) w *= 1.5
    w *= 0.84 + depth * 0.16

    const rot = (r() * 2 - 1) * 12
    const print = document.createElement("div")
    print.className = "print"
    print.style.width = w + "px"
    print.style.setProperty("--rot", rot.toFixed(2) + "deg")
    print.style.setProperty("--ar", work.ratio.toFixed(4))

    const img = new Image()
    img.src = work.src
    img.alt = nameOf(work)
    img.decoding = "async"
    img.draggable = false
    img.className = "work face"
    if (img.complete && img.naturalWidth) img.classList.add("is-loaded")
    else img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true })
    print.appendChild(img)

    const veil = document.createElement("div")
    veil.className = "veil face"
    veil.innerHTML = `<button class="chip pin" data-act="pin">Pin</button>
      <button class="chip" data-act="like">♡</button>`
    print.appendChild(veil)

    // задняя грань — CTA для тайм-наджа
    const back = document.createElement("div")
    back.className = "back"
    back.innerHTML = `<h3>Нравится уровень?</h3>
      <p>15 минут — разберём вашу задачу и прикинем решение.</p>
      <a class="btn small" data-cta="call" data-place="flip_nudge" href="#">Забукать звонок</a>
      <button class="later">позже</button>`
    back.querySelector(".later").addEventListener("click", e => {
      e.stopPropagation()
      print.classList.remove("flipped")
    })
    print.appendChild(back)

    spot.appendChild(print)
    stage.appendChild(spot)

    spot.addEventListener("click", e => {
      if (dragMoved > 6) return
      const act = e.target.dataset && e.target.dataset.act
      if (act === "pin") return openPin(i)
      if (act === "like") return likeWork(i, e.target, spot)
      if (e.target.closest(".back")) return
      openSpot(i)
    })

    items.push({ el: spot, x: spots[i].x, y: spots[i].y, depth, type: "work", idx: i, print })

    if (animate && !REDUCED) {
      const cx = spots[i].x - bw / 2
      const cy = spots[i].y - bh / 2
      const len = Math.hypot(cx, cy) || 1
      const d = 380 + r() * 380
      print.animate(
        [
          { transform: `translate(${(cx / len) * d}px, ${(cy / len) * d}px) rotate(${(rot * 2.2).toFixed(1)}deg) scale(1.18)`, opacity: 0 },
          { transform: `rotate(${rot.toFixed(2)}deg)`, opacity: 1 },
        ],
        { duration: 900, delay: i * 34 + r() * 80, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" }
      )
    }
  })

  // --- чёрная CTA-карточка среди работ ---
  {
    const spot = document.createElement("div")
    spot.className = "spot"
    spot.style.setProperty("--z", 300)
    const card = document.createElement("div")
    card.className = "ctacard"
    card.style.width = base * 0.32 + "px"
    card.style.setProperty("--rot", "-4deg")
    card.innerHTML = `<h3>Хочу так же</h3>
      <p>15-минутный звонок: разберём вашу задачу, прикинем ходы. Бесплатно и без обязательств.</p>
      <a class="btn" data-cta="call" data-place="table_card" href="#"><span class="dot-live"></span>Забукать звонок</a>`
    spot.appendChild(card)
    stage.appendChild(spot)
    items.push({ el: spot, x: ctaPos.x, y: ctaPos.y, depth: 1.05, type: "cta" })
  }

  // --- стопка полароидов Instagram ---
  {
    const spot = document.createElement("div")
    spot.className = "spot"
    spot.style.setProperty("--z", 290)
    const stack = document.createElement("div")
    stack.className = "igstack"
    const s = base * 0.2
    stack.style.width = s + "px"
    stack.style.height = s * 1.12 + "px"
    stack.style.setProperty("--rot", "5deg")
    const picks = shuffled(WORKS, 4).slice(0, 3)
    picks.forEach((wk, k) => {
      const ph = document.createElement("div")
      ph.className = "ph"
      ph.style.width = s * 0.82 + "px"
      ph.style.left = k * s * 0.09 + "px"
      ph.style.top = k * s * 0.05 + "px"
      ph.style.transform = `rotate(${(k - 1) * 9}deg)`
      const im = new Image()
      im.src = wk.src
      im.draggable = false
      ph.appendChild(im)
      stack.appendChild(ph)
    })
    const tag = document.createElement("div")
    tag.className = "tag"
    tag.textContent = "Instagram · процесс"
    stack.appendChild(tag)
    spot.appendChild(stack)
    stage.appendChild(spot)
    spot.addEventListener("click", () => {
      if (dragMoved > 6) return
      track("cta_click", { cta: "instagram", place: "table_stack" })
      open(LINKS.instagram, "_blank", "noopener")
    })
    items.push({ el: spot, x: igPos.x, y: igPos.y, depth: 0.95, type: "ig" })
  }

  // --- бумажный самолётик Telegram ---
  plane = document.createElement("div")
  plane.id = "plane"
  plane.innerHTML = `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <path d="M6 30 L58 10 L38 54 L30 36 Z" fill="#1d93d2"/>
      <path d="M30 36 L58 10 L34 40 Z" fill="#0f6ea5"/>
    </svg>
    <span class="tag">Разборы кейсов — в Telegram</span>`
  stage.appendChild(plane)
  plane.addEventListener("click", () => {
    if (dragMoved > 6) return
    track("cta_click", { cta: "telegram", place: "plane" })
    open(LINKS.telegram, "_blank", "noopener")
  })

  wireCtas()
  placeItems()
}

// ---- drag / drift (из Galds) ----------------------------------------------------------

stage.addEventListener("pointerdown", e => {
  dragging = true
  dragMoved = 0
  stage.classList.add("is-dragging")
  stage.setPointerCapture(e.pointerId)
  lastX = e.clientX
  lastY = e.clientY
  lastT = performance.now()
  velX = velY = 0
  idle = 0
})
stage.addEventListener("pointermove", e => {
  tmx = (e.clientX / vw) * 2 - 1
  tmy = (e.clientY / vh) * 2 - 1
  if (!dragging) return
  const now = performance.now()
  const dt = Math.max(8, now - lastT) / 1000
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  dragMoved += Math.abs(dx) + Math.abs(dy)
  panX += dx
  panY += dy
  velX = velX * 0.6 + (dx / dt) * 0.4
  velY = velY * 0.6 + (dy / dt) * 0.4
  lastX = e.clientX
  lastY = e.clientY
  lastT = now
  idle = 0
})
const endDrag = () => {
  dragging = false
  stage.classList.remove("is-dragging")
}
stage.addEventListener("pointerup", endDrag)
stage.addEventListener("pointercancel", endDrag)
addEventListener(
  "wheel",
  e => {
    e.preventDefault()
    panX -= e.deltaX
    panY -= e.deltaY
    velX = velY = 0
    idle = 0
  },
  { passive: false }
)

function clampPan() {
  const limX = Math.max(0, (bw - vw) / 2 / 1.2 - 30)
  const limY = Math.max(0, (bh - vh) / 2 / 1.2 - 30)
  panX = Math.max(-limX, Math.min(limX, panX))
  panY = Math.max(-limY, Math.min(limY, panY))
}

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt
  idle += dt

  if (!dragging) {
    panX += velX * dt
    panY += velY * dt
    const f = Math.pow(0.1, dt)
    velX *= f
    velY *= f
    if (idle > 5 && !REDUCED && scatterT === 0) {
      const ax = Math.sin(t * 0.09) * (bw - vw) * 0.22
      const ay = Math.cos(t * 0.07) * (bh - vh) * 0.22
      const k = Math.min(1, dt * 0.3)
      panX += (ax - panX) * k
      panY += (ay - panY) * k
    }
  }
  clampPan()

  scatterK += (scatterT - scatterK) * Math.min(1, dt * 4)
  const km = Math.min(1, dt * 4)
  mx += (tmx - mx) * km
  my += (tmy - my) * km

  placeItems()

  requestAnimationFrame(frame)
}

// расставляет все предметы по текущему пану — вызывается каждый кадр и
// синхронно сразу после build(), чтобы стол не мигал кучей в углу
function placeItems() {
  const baseX = (vw - bw) / 2
  const baseY = (vh - bh) / 2
  for (const p of items) {
    const d = p.depth
    const sx = p.x + (p.x - bw / 2) * scatterK * 0.9
    const sy = p.y + (p.y - bh / 2) * scatterK * 0.9
    const x = sx + baseX + (panX - mx * 24) * d
    const y = sy + baseY + (panY - my * 18) * d
    p.el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
  }

  // самолётик наматывает круги над столом
  if (plane) {
    const a = t * 0.12
    const px = bw / 2 + Math.cos(a) * bw * 0.3
    const py = bh / 2 + Math.sin(a) * bh * 0.24
    const x = px + baseX + (panX - mx * 24) * 1.12
    const y = py + baseY + (panY - my * 18) * 1.12 + Math.sin(t * 1.7) * 9
    const heading = (Math.atan2(Math.cos(a) * bh * 0.24, -Math.sin(a) * bw * 0.3) * 180) / Math.PI
    plane.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(heading + 100).toFixed(1)}deg)`
    plane.querySelector(".tag").style.transform = `rotate(${(-heading - 100).toFixed(1)}deg)`
  }
}

// ---- спотлайт --------------------------------------------------------------------------

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
  spotLike.textContent = likes.has(key(spotIdx)) ? "♥" : "♡"
  spot.classList.add("on")
  spot.querySelector(".sheet").animate(
    [
      { transform: "scale(0.86) translateY(24px)", opacity: 0 },
      { transform: "none", opacity: 1 },
    ],
    { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
  )
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
spot.addEventListener("click", e => e.target === spot && closeSpot())
document.getElementById("prevW").addEventListener("click", () => openSpot(spotIdx - 1))
document.getElementById("nextW").addEventListener("click", () => openSpot(spotIdx + 1))
document.getElementById("spotPin").addEventListener("click", () => openPin(spotIdx))
document.getElementById("spotShare").addEventListener("click", () => shareWork(spotIdx))
spotLike.addEventListener("click", () => likeWork(spotIdx, spotLike, null))
addEventListener("keydown", e => {
  if (!spot.classList.contains("on")) return
  if (e.key === "Escape") closeSpot()
  if (e.key === "ArrowLeft") openSpot(spotIdx - 1)
  if (e.key === "ArrowRight") openSpot(spotIdx + 1)
})

// ---- лайки: миниатюра улетает в стопку ---------------------------------------------------

const likes = new Set(JSON.parse(localStorage.getItem("redo_likes2") || "[]"))
const stackEl = document.getElementById("likestack")
const countEl = document.getElementById("likecount")
const tgoffer = document.getElementById("tgoffer")
const key = i => ORDER[i].slug + "#" + i

function likeWork(idx, chip, sourceSpot) {
  const k = key(idx)
  if (likes.has(k)) {
    likes.delete(k)
  } else {
    likes.add(k)
    flyToStack(idx, sourceSpot)
  }
  localStorage.setItem("redo_likes2", JSON.stringify([...likes]))
  if (chip) chip.textContent = likes.has(k) ? "♥" : "♡"
  renderStack()
  track("like", { work: ORDER[idx].slug, total: likes.size })
  if (likes.size >= 3 && !tgoffer.classList.contains("on")) {
    tgoffer.classList.add("on")
    track("like_magnet_shown", { total: likes.size })
  }
}

function flyToStack(idx, sourceSpot) {
  const src = sourceSpot ? sourceSpot.getBoundingClientRect() : spotImg.getBoundingClientRect()
  const dst = stackEl.getBoundingClientRect()
  const ghost = new Image()
  ghost.src = ORDER[idx].src
  ghost.style.cssText = `position:fixed;left:${src.x}px;top:${src.y}px;width:${src.width}px;
    height:${src.height}px;object-fit:cover;z-index:200;pointer-events:none;border-radius:4px;`
  document.body.appendChild(ghost)
  ghost
    .animate(
      [
        { transform: "none", opacity: 1 },
        {
          transform: `translate(${dst.x - src.x}px, ${dst.y - src.y}px) scale(${dst.width / src.width})`,
          opacity: 0.9,
        },
      ],
      { duration: 640, easing: "cubic-bezier(0.4, 0, 0.3, 1)" }
    )
    .finished.then(() => ghost.remove(), () => ghost.remove())
}

function renderStack() {
  stackEl.querySelectorAll(".mini").forEach(m => m.remove())
  const arr = [...likes].slice(-4)
  arr.forEach((k, i) => {
    const idx = parseInt(k.split("#")[1], 10)
    const mini = document.createElement("div")
    mini.className = "mini"
    mini.style.transform = `rotate(${(i - 1.5) * 7}deg) translate(${i * 3}px, ${-i * 4}px)`
    const im = new Image()
    im.src = ORDER[idx] ? ORDER[idx].src : ""
    mini.appendChild(im)
    stackEl.appendChild(mini)
  })
  countEl.style.display = likes.size ? "block" : "none"
  countEl.textContent = likes.size
}

// ---- exit-intent: стол раздвигается -------------------------------------------------------

const exitOverlay = document.getElementById("exit")
document.addEventListener("mouseout", e => {
  if (e.relatedTarget || e.clientY > 8) return
  if (sessionStorage.getItem("redo_exit2") === "1") return
  if (spot.classList.contains("on")) return
  sessionStorage.setItem("redo_exit2", "1")
  scatterT = 1
  exitOverlay.classList.add("on")
  track("exit_modal_shown")
})
exitOverlay.addEventListener("click", e => {
  if (e.target !== exitOverlay) return
  exitOverlay.classList.remove("on")
  scatterT = 0
})

// ---- тайм-надж: одна из работ переворачивается ---------------------------------------------
// взводится из onViewport ПОСЛЕ build() — до этого стол пуст и наджу нечего переворачивать

const NUDGE_DELAY = params.has("fast") ? 2500 : 25000
function armNudge() {
  if (sessionStorage.getItem("redo_flip2") === "1") return
  setTimeout(() => {
    if (spot.classList.contains("on") || exitOverlay.classList.contains("on")) return
    sessionStorage.setItem("redo_flip2", "1")
    // ближайшая к центру экрана работа
    let best = null
    let bestD = Infinity
    for (const p of items) {
      if (p.type !== "work") continue
      const r = p.el.getBoundingClientRect()
      const d = Math.hypot(r.x + r.width / 2 - vw / 2, r.y + r.height / 2 - vh / 2)
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    if (best) {
      best.print.classList.add("flipped")
      track("flip_nudge_shown", { work: ORDER[best.idx].slug })
    }
  }, NUDGE_DELAY)
}

// ---- toast ----------------------------------------------------------------------------------

const toastEl = document.getElementById("toast")
let toastT
function toast(text) {
  toastEl.textContent = text
  toastEl.classList.add("on")
  clearTimeout(toastT)
  toastT = setTimeout(() => toastEl.classList.remove("on"), 2800)
}

// ---- go -------------------------------------------------------------------------------------

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) build()
  }, 220)
})

onViewport(() => {
  build(true)
  renderStack()
  wireCtas()
  armNudge()
  if (params.has("w")) {
    const idx = parseInt(params.get("w"), 10)
    if (!isNaN(idx) && idx >= 0 && idx < ORDER.length) {
      track("pin_landing", { work: ORDER[idx].slug })
      setTimeout(() => openSpot(idx), 500)
    }
  }
  prev = performance.now()
  requestAnimationFrame(frame)
})
