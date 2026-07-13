import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Aizkari 074: the portfolio as a bead curtain across the doorway. Thirty
// floor-length strips hang side by side, one work each. Walk your cursor
// through and the strands you brush swing aside, knock into their
// neighbours and settle back to rest. Click throws the whole curtain open
// in a gust.

const stage = document.getElementById("stage")

let strips = [] // { el, x, ang, vel }
let lastX = null
let lastT = 0
let t = 0

function build() {
  stage.innerHTML = ""
  strips = []
  const vw = innerWidth
  const works = shuffled(WORKS, 75)
  const n = works.length
  const sw = vw / n

  works.forEach((work, i) => {
    const el = document.createElement("div")
    el.className = "strip"
    el.style.left = (i * sw).toFixed(2) + "px"
    el.style.width = Math.ceil(sw) + 0.5 + "px"
    const img = workImage(work)
    img.classList.remove("work")
    img.addEventListener("load", () => img.classList.add("on"), { once: true })
    if (img.complete && img.naturalWidth) img.classList.add("on")
    el.appendChild(img)
    stage.appendChild(el)
    strips.push({ el, x: (i + 0.5) * sw, ang: 0, vel: 0, phase: i * 0.37 })
  })
}

stage.addEventListener("pointermove", e => {
  const now = performance.now()
  if (lastX != null) {
    const dt = Math.max(8, now - lastT)
    const vx = ((e.clientX - lastX) / dt) * 1000 // px/s
    const reach = Math.min(innerWidth, innerHeight) * 0.13
    for (const s of strips) {
      const d = Math.abs(s.x - e.clientX)
      if (d < reach) {
        const falloff = 1 - d / reach
        s.vel += vx * 0.14 * falloff
      }
    }
  }
  lastX = e.clientX
  lastT = now
})
stage.addEventListener("pointerleave", () => (lastX = null))
stage.addEventListener("pointerdown", e => {
  const dir = e.clientX < innerWidth / 2 ? 1 : -1
  strips.forEach((s, i) => (s.vel += dir * (46 + i * 0.6)))
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.04, (now - prev) / 1000)
  prev = now
  t += dt

  for (const s of strips) {
    // pendulum spring back to rest + neighbour-ish idle sway
    const idle = REDUCED ? 0 : Math.sin(t * 0.7 + s.phase) * 0.5
    const acc = -(s.ang - idle) * 46 - s.vel * 3.2
    s.vel += acc * dt
    s.ang += s.vel * dt
    s.ang = Math.max(-24, Math.min(24, s.ang))
    s.el.style.transform = `rotate(${s.ang.toFixed(2)}deg) translateZ(${Math.abs(s.ang) * 1.4}px)`
    s.el.style.filter = `brightness(${(1 - Math.abs(s.ang) * 0.008).toFixed(3)})`
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

mountNav(45)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
