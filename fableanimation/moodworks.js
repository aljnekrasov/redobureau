// Shared bits for the five mood-board studies (mood1–mood5): thirty works
// from redobureau.com/work — two per published project — resized to ≤900px
// and kept locally in moodassets/ so the boards open fast and offline.
// Pixel sizes are baked in so every layout settles before a single image
// arrives. Plus a seeded PRNG (same board on every visit), the textless
// dot navigation and a small <img> factory that fades itself in.

const LIST = [
  ["01-centaurasingularity.jpg", 900, 600],
  ["02-centaurasingularity.jpg", 900, 600],
  ["03-dv-capital.jpg", 900, 600],
  ["04-dv-capital.jpg", 900, 600],
  ["05-faberlic-bioglow.jpg", 900, 600],
  ["06-faberlic-bioglow.jpg", 900, 600],
  ["07-faberlic-masks.jpg", 900, 600],
  ["08-faberlic-masks.jpg", 900, 600],
  ["09-keep-looking.jpg", 900, 600],
  ["10-keep-looking.jpg", 900, 600],
  ["11-lure-oysters.jpg", 600, 900],
  ["12-lure-oysters.jpg", 900, 675],
  ["13-mail-ru.jpg", 900, 600],
  ["14-mail-ru.jpg", 900, 600],
  ["15-move.jpg", 900, 506],
  ["16-move.jpg", 900, 506],
  ["17-nude-stories.jpg", 900, 599],
  ["18-nude-stories.jpg", 900, 600],
  ["19-ob-edinenie-love-gentle-union.jpg", 900, 600],
  ["20-ob-edinenie-love-gentle-union.jpg", 900, 600],
  ["21-petnat.jpg", 900, 455],
  ["22-petnat.jpg", 900, 600],
  ["23-roomp.jpg", 900, 250],
  ["24-roomp.jpg", 600, 900],
  ["25-ub-design.jpg", 900, 600],
  ["26-ub-design.jpg", 900, 600],
  ["27-uppa-winery-reimagining-the-classic-line.jpg", 900, 600],
  ["28-uppa-winery-reimagining-the-classic-line.jpg", 900, 600],
  ["29-uppa-winery.jpg", 900, 600],
  ["30-uppa-winery.jpg", 900, 600],
]

export const WORKS = LIST.map(([file, w, h]) => ({
  src: "moodassets/" + file,
  w,
  h,
  ratio: w / h,
  slug: file.slice(3, -4),
}))

export const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches

// How many mood-board studies exist (mood1…moodTOTAL) — drives the dot nav.
export const TOTAL = 25

// Layouts are built from innerWidth/innerHeight — but prerendered or
// embedded tabs report a 0×0 viewport until they are actually shown.
// Defer the first build until the viewport is real.
export function onViewport(fn) {
  const tick = () => {
    if (innerWidth > 0 && innerHeight > 0) fn()
    else requestAnimationFrame(tick)
  }
  tick()
}

// mulberry32 — deterministic, so a board never reshuffles behind your back
export function rng(seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffled(list, seed = 1) {
  const r = rng(seed)
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// A work as an <img> that reveals itself once pixels are actually there
export function workImage(work) {
  const img = new Image()
  img.src = work.src
  img.alt = ""
  img.decoding = "async"
  img.draggable = false
  img.className = "work"
  if (img.complete && img.naturalWidth) img.classList.add("is-loaded")
  else img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true })
  return img
}

// Preload the actual bitmaps (for the canvas / WebGL boards, which can't use
// an <img> in the DOM). Same-origin, so the pixels stay untainted and can be
// uploaded as textures or read back. Never rejects — a broken one resolves
// to a blank image so one 404 can't stall the whole board.
export function loadAll(works) {
  return Promise.all(
    works.map(
      w =>
        new Promise(res => {
          const img = new Image()
          img.decoding = "async"
          img.onload = () => res(img)
          img.onerror = () => res(img)
          img.src = w.src
          img.work = w
        })
    )
  )
}

// cover-fit source draw — the atlas/canvas boards lean on this to pack works
// of mixed ratio into uniform cells without squashing.
export function coverDraw(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width || 1
  const ih = img.naturalHeight || img.height || 1
  const s = Math.max(dw / iw, dh / ih)
  const w = iw * s
  const h = ih * s
  ctx.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h)
}

// A row of dots, zero words. Click to jump; ← / → cycle, digits 1–9 jump.
// The lot sits under mix-blend-mode:difference so it reads on any board,
// black or cream.
export function mountNav(current) {
  const style = document.createElement("style")
  style.textContent = `
    .mb-nav { position: fixed; left: 50%; bottom: 12px; transform: translateX(-50%);
      display: flex; gap: 5px; padding: 8px 10px; z-index: 999;
      mix-blend-mode: difference; max-width: 92vw; flex-wrap: wrap;
      justify-content: center; }
    .mb-nav a { display: block; width: 5px; height: 5px; border-radius: 50%;
      border: 1px solid #fff; box-sizing: border-box; opacity: 0.36;
      transition: opacity 0.25s, transform 0.25s; }
    .mb-nav a:hover { opacity: 1; transform: scale(1.6); }
    .mb-nav a.is-current { background: #fff; opacity: 0.9; }
    /* every fifth dot sits a touch brighter, as a coarse ruler */
    .mb-nav a.tick { opacity: 0.6; }
  `
  document.head.appendChild(style)

  const nav = document.createElement("nav")
  nav.className = "mb-nav"
  for (let i = 1; i <= TOTAL; i++) {
    const a = document.createElement("a")
    a.href = `mood${i}.html`
    a.setAttribute("aria-label", `Mood board ${i}`)
    if (i === current) a.classList.add("is-current")
    else if (i % 5 === 0) a.classList.add("tick")
    nav.appendChild(a)
  }
  document.body.appendChild(nav)

  addEventListener("keydown", e => {
    if (e.key === "ArrowRight") location.href = `mood${(current % TOTAL) + 1}.html`
    else if (e.key === "ArrowLeft") location.href = `mood${((current + TOTAL - 2) % TOTAL) + 1}.html`
    else if (/^[1-9]$/.test(e.key)) location.href = `mood${e.key}.html`
  })
}
