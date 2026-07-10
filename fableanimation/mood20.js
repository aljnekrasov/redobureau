import { WORKS, REDUCED, rng, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Magnēts 049: the works are iron filings and the cursor is the magnet.
// They stream toward wherever you point and pack into a loose cluster that
// trails your hand, jostling for room without overlapping. Click and the
// magnet flips — the whole cluster blows apart, then draws back together.
// When you leave, they settle into a slow orbit around the middle.

const stage = document.getElementById("stage")

let vw = 0
let vh = 0
let bits = []
let mx = 0
let my = 0
let hasMouse = false
let t = 0

function build() {
  vw = innerWidth
  vh = innerHeight
  mx = vw / 2
  my = vh / 2
  stage.innerHTML = ""
  bits = []
  const works = shuffled(WORKS, 49)
  const r = rng(50)
  const vmin = Math.min(vw, vh)
  works.forEach(work => {
    let w = vmin * (0.1 + r() * 0.05)
    if (work.ratio > 2.2) w *= 1.4
    const h = w / Math.min(Math.max(work.ratio, 0.7), 2.2)
    const el = document.createElement("div")
    el.className = "bit"
    el.style.width = w + "px"
    el.style.height = h + "px"
    const img = workImage(work)
    img.classList.remove("work")
    img.addEventListener("load", () => img.classList.add("on"), { once: true })
    if (img.complete && img.naturalWidth) img.classList.add("on")
    el.appendChild(img)
    stage.appendChild(el)
    bits.push({
      el,
      w,
      h,
      rad: Math.hypot(w, h) * 0.42,
      x: r() * vw,
      y: r() * vh,
      vx: 0,
      vy: 0,
    })
  })
}

stage.addEventListener("pointermove", e => {
  mx = e.clientX
  my = e.clientY
  hasMouse = true
})
stage.addEventListener("pointerleave", () => (hasMouse = false))
stage.addEventListener("pointerdown", e => {
  // magnet flips: shove everything away from the click point
  const bx = e.clientX
  const by = e.clientY
  for (const b of bits) {
    const dx = b.x - bx
    const dy = b.y - by
    const d = Math.hypot(dx, dy) || 1
    const f = 900 / (1 + d * 0.02)
    b.vx += (dx / d) * f
    b.vy += (dy / d) * f
  }
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.04, (now - prev) / 1000)
  prev = now
  t += dt

  // where the swarm wants to gather
  let gx = mx
  let gy = my
  if (!hasMouse) {
    gx = vw / 2 + Math.cos(t * 0.5) * vw * 0.16
    gy = vh / 2 + Math.sin(t * 0.5) * vh * 0.16
  }

  const pull = hasMouse ? 30 : 12
  for (const b of bits) {
    b.vx += (gx - b.x) * pull * dt
    b.vy += (gy - b.y) * pull * dt
  }

  // pairwise separation so they cluster instead of stacking
  for (let i = 0; i < bits.length; i++) {
    for (let j = i + 1; j < bits.length; j++) {
      const a = bits[i]
      const c = bits[j]
      const dx = c.x - a.x
      const dy = c.y - a.y
      const d = Math.hypot(dx, dy) || 1
      const min = a.rad + c.rad
      if (d < min) {
        const push = ((min - d) / d) * 90
        const ox = dx * push * dt
        const oy = dy * push * dt
        a.vx -= ox
        a.vy -= oy
        c.vx += ox
        c.vy += oy
      }
    }
  }

  const damp = Math.pow(0.0009, dt)
  for (const b of bits) {
    b.vx *= damp
    b.vy *= damp
    b.x += b.vx * dt
    b.y += b.vy * dt
    // soft walls
    const mX = b.w / 2
    const mY = b.h / 2
    if (b.x < mX) { b.x = mX; b.vx = Math.abs(b.vx) * 0.5 }
    else if (b.x > vw - mX) { b.x = vw - mX; b.vx = -Math.abs(b.vx) * 0.5 }
    if (b.y < mY) { b.y = mY; b.vy = Math.abs(b.vy) * 0.5 }
    else if (b.y > vh - mY) { b.y = vh - mY; b.vy = -Math.abs(b.vy) * 0.5 }
    const tilt = b.vx * 0.02
    b.el.style.transform = `translate(${(b.x - b.w / 2).toFixed(1)}px, ${(b.y - b.h / 2).toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`
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

mountNav(20)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
