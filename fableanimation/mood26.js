import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Spirāle 055: the works seeded like a sunflower head — each set at the
// golden angle from the last, spiralling out from the centre. The whole
// head turns slowly; drag to spin it, wheel to fall inward or pull back
// out along the spiral. Seeds shrink toward the middle, so the eye is drawn
// down the whirl.

const stage = document.getElementById("stage")
const galaxy = document.getElementById("galaxy")

const GOLDEN = Math.PI * (3 - Math.sqrt(5)) // 137.5°

let seeds = []
let angle = 0
let vel = 0.05
let zoom = 1
let zoomT = 1
let dragging = false
let lastX = 0
let lastT = 0

function build() {
  const vmin = Math.min(innerWidth, innerHeight)
  galaxy.innerHTML = ""
  seeds = []
  const works = shuffled(WORKS, 55)
  const spacing = vmin * 0.052
  works.forEach((work, i) => {
    const r = spacing * Math.sqrt(i + 0.5)
    const a = i * GOLDEN
    const el = document.createElement("div")
    el.className = "seed"
    // outer seeds larger, inner smaller — a funnel down the spiral
    const w = vmin * (0.07 + 0.09 * (i / works.length))
    const h = w / Math.min(Math.max(work.ratio, 0.7), 1.8)
    el.style.width = w + "px"
    el.style.height = h + "px"
    const img = workImage(work)
    img.classList.remove("work")
    img.addEventListener("load", () => img.classList.add("on"), { once: true })
    if (img.complete && img.naturalWidth) img.classList.add("on")
    el.appendChild(img)
    galaxy.appendChild(el)
    el.style.zIndex = i
    seeds.push({ el, r, a, w, h })
  })
}

stage.addEventListener("pointerdown", e => {
  dragging = true
  stage.classList.add("is-dragging")
  stage.setPointerCapture(e.pointerId)
  lastX = e.clientX
  lastT = performance.now()
  vel = 0
})
stage.addEventListener("pointermove", e => {
  if (!dragging) return
  const now = performance.now()
  const dt = Math.max(8, now - lastT) / 1000
  const dA = (e.clientX - lastX) * 0.005
  angle += dA
  vel = vel * 0.5 + (dA / dt) * 0.5
  lastX = e.clientX
  lastT = now
})
const end = () => {
  dragging = false
  stage.classList.remove("is-dragging")
}
stage.addEventListener("pointerup", end)
stage.addEventListener("pointercancel", end)
addEventListener(
  "wheel",
  e => {
    e.preventDefault()
    zoomT *= Math.exp(-e.deltaY * 0.0012)
    zoomT = Math.max(0.45, Math.min(2.4, zoomT))
  },
  { passive: false }
)

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  if (!dragging) {
    angle += vel * dt
    vel *= Math.pow(0.5, dt)
    if (Math.abs(vel) < 0.05 && !REDUCED) vel += (0.05 - vel) * Math.min(1, dt * 0.4)
  }
  zoom += (zoomT - zoom) * Math.min(1, dt * 5)

  for (const s of seeds) {
    const a = s.a + angle
    const x = Math.cos(a) * s.r * zoom
    const y = Math.sin(a) * s.r * zoom
    // seeds stay upright for legibility
    s.el.style.transform = `translate(${(x - s.w / 2).toFixed(1)}px, ${(y - s.h / 2).toFixed(1)}px)`
  }

  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) build()
  }, 200)
})

mountNav(26)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
