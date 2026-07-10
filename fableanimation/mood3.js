import { WORKS, REDUCED, rng, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Orbita 032: a planetary system of work. Three elliptical rings — 8, 10
// and 12 pieces — hug the viewport and revolve in alternating directions,
// like a slow clockwork. Grab anywhere and spin the whole thing; the
// wheel zooms into the board and back out. Hovering a piece freezes its
// ring while the others keep turning.

const stage = document.getElementById("stage")
const system = document.getElementById("system")

// share of the works per ring, ellipse size as share of the half-viewport,
// item width as share of min(vw, vh), angular speed rad/s. Sizes stay well
// under the ring spacing so the three orbits read as orbits, not a pile.
const RINGS = [
  { count: 8, k: 0.32, size: 0.16, speed: 0.06 },
  { count: 10, k: 0.62, size: 0.135, speed: -0.042 },
  { count: 12, k: 0.95, size: 0.108, speed: 0.03 },
]

let vw = innerWidth
let vh = innerHeight
const rings = []

function build() {
  vw = innerWidth
  vh = innerHeight
  system.innerHTML = ""
  rings.length = 0

  const works = shuffled(WORKS, 5)
  const r = rng(13)
  let cursor = 0
  const base = Math.min(vw, vh)

  RINGS.forEach((cfg, ri) => {
    const ring = {
      ...cfg,
      angle: -0.6 * Math.sign(cfg.speed),
      hover: 1,
      hoverT: 1,
      items: [],
    }
    for (let i = 0; i < cfg.count; i++) {
      const work = works[cursor++]
      const orb = document.createElement("div")
      orb.className = "orb"
      const ph = document.createElement("div")
      ph.className = "ph"
      let w = base * cfg.size * (0.92 + r() * 0.16)
      if (work.ratio < 1) w *= 0.72
      if (work.ratio > 2.4) w *= 1.5
      ph.style.width = w + "px"
      ph.style.setProperty("--ar", work.ratio.toFixed(4))
      ph.appendChild(workImage(work))
      orb.appendChild(ph)
      system.appendChild(orb)

      orb.addEventListener("pointerenter", () => (ring.hoverT = 0))
      orb.addEventListener("pointerleave", () => (ring.hoverT = 1))

      if (!REDUCED) {
        ph.animate(
          [
            { opacity: 0, transform: "scale(0.4)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          {
            duration: 700,
            delay: ri * 260 + i * 46,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "backwards",
          }
        )
      }

      ring.items.push({ el: orb, phase: (i / cfg.count) * Math.PI * 2 })
    }
    rings.push(ring)
  })
}

// --- spin: drag rotates every ring around the viewport centre ----------------

let spinVel = 0
let dragging = false
let lastA = 0
let lastT = 0

const pointerAngle = e =>
  Math.atan2(e.clientY - vh / 2, e.clientX - vw / 2)

stage.addEventListener("pointerdown", e => {
  dragging = true
  stage.classList.add("is-dragging")
  stage.setPointerCapture(e.pointerId)
  lastA = pointerAngle(e)
  lastT = performance.now()
  spinVel = 0
})

stage.addEventListener("pointermove", e => {
  if (!dragging) return
  const a = pointerAngle(e)
  let dA = a - lastA
  if (dA > Math.PI) dA -= Math.PI * 2
  if (dA < -Math.PI) dA += Math.PI * 2
  const now = performance.now()
  const dt = Math.max(8, now - lastT) / 1000
  for (const ring of rings) ring.angle += dA
  spinVel = spinVel * 0.55 + (dA / dt) * 0.45
  lastA = a
  lastT = now
})

const endDrag = () => {
  dragging = false
  stage.classList.remove("is-dragging")
}
stage.addEventListener("pointerup", endDrag)
stage.addEventListener("pointercancel", endDrag)

// --- zoom ---------------------------------------------------------------------

let zoom = 1
let zoomT = 1

addEventListener(
  "wheel",
  e => {
    e.preventDefault()
    zoomT *= Math.exp(-e.deltaY * 0.0013)
    zoomT = Math.max(0.55, Math.min(1.75, zoomT))
  },
  { passive: false }
)

// --- clockwork ------------------------------------------------------------------

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  if (!dragging) {
    for (const ring of rings) ring.angle += spinVel * dt
    spinVel *= Math.pow(0.3, dt)
  }

  zoom += (zoomT - zoom) * Math.min(1, dt * 6)
  system.style.transform = `scale(${zoom.toFixed(4)})`

  for (const ring of rings) {
    ring.hover += (ring.hoverT - ring.hover) * Math.min(1, dt * 6)
    if (!dragging && !REDUCED) ring.angle += ring.speed * ring.hover * dt
    for (const item of ring.items) {
      const a = ring.angle + item.phase
      const x = Math.cos(a) * (vw / 2) * ring.k
      const y = Math.sin(a) * (vh / 2) * ring.k
      item.el.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
    }
  }

  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) build()
  }, 220)
})

mountNav(3)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
