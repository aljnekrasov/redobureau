import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Karuselis 039: the thirty works wrapped around a slowly turning drum in
// real 3D space. The piece facing you sits closest and biggest; the rest
// curve away around the cylinder. Grab and spin it, throw it for momentum,
// or leave it — it revolves on its own. Two staggered rings so the drum
// reads as full, not a single hoop.

const view = document.getElementById("view")
const ring = document.getElementById("ring")

let vw = innerWidth
let vh = innerHeight
let radius = 620
let angle = 0
let vel = 8 // deg/s idle spin
let dragging = false
let lastX = 0
let lastT = 0
let panels = []

function build() {
  vw = innerWidth
  vh = innerHeight
  ring.innerHTML = ""
  panels = []
  const works = shuffled(WORKS, 14)
  const base = Math.min(vw, vh)
  radius = Math.max(vw, vh) * 0.55

  // two rings, half the works each, offset vertically and in phase
  const rings = [
    { list: works.slice(0, 15), y: -base * 0.16, phase: 0 },
    { list: works.slice(15), y: base * 0.16, phase: 12 },
  ]

  for (const rg of rings) {
    const step = 360 / rg.list.length
    rg.list.forEach((work, i) => {
      const a = i * step + rg.phase
      const panel = document.createElement("div")
      panel.className = "panel"
      const inner = document.createElement("div")
      inner.className = "inner"
      let w = base * 0.27
      const h = w / Math.min(Math.max(work.ratio, 0.7), 2)
      inner.style.width = w + "px"
      inner.style.height = h + "px"
      const img = workImage(work)
      img.classList.remove("work")
      img.addEventListener("load", () => img.classList.add("on"), { once: true })
      if (img.complete && img.naturalWidth) img.classList.add("on")
      inner.appendChild(img)
      panel.appendChild(inner)
      ring.appendChild(panel)
      panels.push({ el: panel, a, y: rg.y })
    })
  }
}

function place() {
  for (const p of panels) {
    p.el.style.transform =
      `rotateY(${p.a + angle}deg) translateZ(${radius}px) translateY(${p.y}px)`
  }
  // push the whole drum back by one radius so the panel facing us sits on
  // the screen plane at ~1:1 and the far side recedes — proper coverflow
  ring.style.transform = `translateZ(${(-radius).toFixed(1)}px) rotateX(3deg)`
}

view.addEventListener("pointerdown", e => {
  dragging = true
  view.classList.add("is-dragging")
  view.setPointerCapture(e.pointerId)
  lastX = e.clientX
  lastT = performance.now()
  vel = 0
})
view.addEventListener("pointermove", e => {
  if (!dragging) return
  const now = performance.now()
  const dt = Math.max(8, now - lastT) / 1000
  const dx = e.clientX - lastX
  const dA = dx * 0.28
  angle += dA
  vel = vel * 0.5 + (dA / dt) * 0.5
  lastX = e.clientX
  lastT = now
})
const end = () => {
  dragging = false
  view.classList.remove("is-dragging")
}
view.addEventListener("pointerup", end)
view.addEventListener("pointercancel", end)
addEventListener(
  "wheel",
  e => {
    e.preventDefault()
    angle += e.deltaY * 0.12
    vel = 0
  },
  { passive: false }
)

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  if (!dragging) {
    angle += vel * dt
    vel *= Math.pow(0.4, dt)
    if (Math.abs(vel) < 8 && !REDUCED) vel += (8 - vel) * Math.min(1, dt * 0.5)
  }
  place()
  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) build()
  }, 200)
})

mountNav(10)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
