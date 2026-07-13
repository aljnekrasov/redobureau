import { WORKS, REDUCED, rng, shuffled, loadAll, mountNav, onViewport } from "./moodworks.js"

// Gravitācija 059 — experimental. Thirty works held in orbit around an unseen
// mass at the centre, each on its own tilted ellipse, inner ones whipping
// round fast and outer ones drifting slow — Kepler's law, roughly. Every
// body smears a light trail behind it as the canvas fades frame to frame.
// Click anywhere to fling the system with a gravitational kick.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

let vw = 0
let vh = 0
let imgs = []
let bodies = []
let t = 0

function build() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  ctx.fillStyle = "#050509"
  ctx.fillRect(0, 0, vw, vh)
  const r = rng(60)
  const vmin = Math.min(vw, vh)
  const order = shuffled(WORKS, 60)
  bodies = order.map((work, i) => {
    const wi = WORKS.indexOf(work)
    const orbit = 0.08 + (i / order.length) * 0.42 // fraction of vmin
    const a = vmin * orbit
    const b = a * (0.55 + r() * 0.35) // ellipse squash
    const w = vmin * (0.11 - orbit * 0.06)
    return {
      img: imgs[wi],
      a,
      b,
      tilt: r() * Math.PI, // ellipse rotation
      phase: r() * Math.PI * 2,
      speed: (0.8 / Math.pow(orbit, 0.9)) * (r() < 0.5 ? 1 : -1) * 0.16,
      w,
      h: w / Math.min(Math.max(work.ratio, 0.7), 2),
    }
  })
}

canvas.addEventListener("pointerdown", () => {
  for (const bd of bodies) bd.speed *= 1.9 + Math.random() * 0.6
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.04, (now - prev) / 1000)
  prev = now
  t += dt

  // fade the previous frame → trails
  ctx.fillStyle = "rgba(5,5,9,0.16)"
  ctx.fillRect(0, 0, vw, vh)

  // relax kicked speeds back toward their base drift
  const cx = vw / 2
  const cy = vh / 2

  // glow at the centre of mass
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(vw, vh) * 0.14)
  g.addColorStop(0, "rgba(150,170,255,0.20)")
  g.addColorStop(1, "rgba(150,170,255,0)")
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, Math.min(vw, vh) * 0.14, 0, 6.2832)
  ctx.fill()

  for (const bd of bodies) {
    bd.phase += (REDUCED ? bd.speed * 0.3 : bd.speed) * dt * 6
    // ellipse point, rotated by tilt
    const ex = Math.cos(bd.phase) * bd.a
    const ey = Math.sin(bd.phase) * bd.b
    const ct = Math.cos(bd.tilt)
    const st = Math.sin(bd.tilt)
    const x = cx + ex * ct - ey * st
    const y = cy + ex * st + ey * ct
    if (bd.img && bd.img.naturalWidth) {
      ctx.globalAlpha = 0.95
      ctx.drawImage(bd.img, x - bd.w / 2, y - bd.h / 2, bd.w, bd.h)
      ctx.globalAlpha = 1
    }
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

mountNav(30)
onViewport(async () => {
  imgs = await loadAll(WORKS)
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
