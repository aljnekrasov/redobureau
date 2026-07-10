import { WORKS, REDUCED, rng, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Mozaīka 054: thirty works cropped to circles and packed like a tray of
// coins — big discs and small, jostled together by a soft physics into one
// dense cluster that breathes and slowly turns. Hover a disc and it swells,
// shouldering its neighbours aside to fill your view, then settles back.

const stage = document.getElementById("stage")

let vw = 0
let vh = 0
let discs = []
let t = 0

function build() {
  vw = innerWidth
  vh = innerHeight
  stage.innerHTML = ""
  discs = []
  const works = shuffled(WORKS, 54)
  const r = rng(55)
  const vmin = Math.min(vw, vh)

  works.forEach((work, i) => {
    // a spread of sizes — a few hero discs, many small
    const roll = r()
    const size = roll > 0.85 ? 1.5 : roll > 0.6 ? 1.1 : 0.72
    const rad = vmin * 0.11 * size
    const el = document.createElement("div")
    el.className = "disc"
    el.style.width = el.style.height = rad * 2 + "px"
    const img = workImage(work)
    img.classList.remove("work")
    img.addEventListener("load", () => img.classList.add("on"), { once: true })
    if (img.complete && img.naturalWidth) img.classList.add("on")
    el.appendChild(img)
    stage.appendChild(el)

    const a = r() * Math.PI * 2
    const rr = r() * vmin * 0.3
    const d = {
      el,
      rad,
      base: rad,
      x: vw / 2 + Math.cos(a) * rr,
      y: vh / 2 + Math.sin(a) * rr,
      vx: 0,
      vy: 0,
      hoverT: 0,
      hover: 0,
      z: i,
    }
    el.style.zIndex = i
    el.addEventListener("pointerenter", () => (d.hoverT = 1))
    el.addEventListener("pointerleave", () => (d.hoverT = 0))
    discs.push(d)
  })
}

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.04, (now - prev) / 1000)
  prev = now
  t += dt

  const cx = vw / 2
  const cy = vh / 2
  const breath = REDUCED ? 1 : 1 + Math.sin(t * 0.6) * 0.03

  for (const d of discs) {
    d.hover += (d.hoverT - d.hover) * Math.min(1, dt * 8)
    d.rad = d.base * breath * (1 + d.hover * 0.9)
    d.el.style.zIndex = d.hoverT ? 500 : d.z
    // gravity to centre keeps the cluster together
    d.vx += (cx - d.x) * 1.6 * dt
    d.vy += (cy - d.y) * 1.6 * dt
    // a slow carousel turn around the middle
    if (!REDUCED) {
      const dx = d.x - cx
      const dy = d.y - cy
      d.vx += -dy * 0.06 * dt
      d.vy += dx * 0.06 * dt
    }
  }

  // separation: keep discs from overlapping
  for (let i = 0; i < discs.length; i++) {
    for (let j = i + 1; j < discs.length; j++) {
      const a = discs[i]
      const c = discs[j]
      const dx = c.x - a.x
      const dy = c.y - a.y
      const dist = Math.hypot(dx, dy) || 1
      const min = a.rad + c.rad + 3
      if (dist < min) {
        const push = ((min - dist) / dist) * 0.5
        const ox = dx * push
        const oy = dy * push
        // heavier (bigger) discs shove less
        const wa = c.rad / (a.rad + c.rad)
        const wb = a.rad / (a.rad + c.rad)
        a.x -= ox * wa
        a.y -= oy * wa
        c.x += ox * wb
        c.y += oy * wb
      }
    }
  }

  const damp = Math.pow(0.0006, dt)
  for (const d of discs) {
    d.vx *= damp
    d.vy *= damp
    d.x += d.vx * dt
    d.y += d.vy * dt
    d.el.style.width = d.el.style.height = (d.rad * 2).toFixed(1) + "px"
    d.el.style.transform = `translate(${(d.x - d.rad).toFixed(1)}px, ${(d.y - d.rad).toFixed(1)}px)`
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

mountNav(25)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
