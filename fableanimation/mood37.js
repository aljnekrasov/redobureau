import { WORKS, REDUCED, shuffled, loadAll, mountNav, onViewport } from "./moodworks.js"

// Radars 066: the works sit in the dark on two concentric rings. A radar
// beam sweeps round; whatever it touches lights to full colour, then decays
// back into the gloom as afterglow. Drag around the centre to spin the beam
// yourself; it keeps your momentum, then settles back to its patrol.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

let vw = 0
let vh = 0
let imgs = []
let items = []
let sweep = 0
let vel = 0.55 // rad/s patrol speed
let dragging = false
let lastA = 0
let lastT = 0

function coverRect(img, w, h) {
  const iw = img.naturalWidth || 1
  const ih = img.naturalHeight || 1
  if (ih / iw > h / w) {
    const sh = (iw * h) / w
    return [0, (ih - sh) / 2, iw, sh]
  }
  const sw = (ih * w) / h
  return [(iw - sw) / 2, 0, sw, ih]
}

function build() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  items = []
  const vmin = Math.min(vw, vh)
  const order = shuffled(WORKS, 67)
  const rings = [
    { n: 12, r: vmin * 0.26, s: vmin * 0.1 },
    { n: 18, r: vmin * 0.43, s: vmin * 0.088 },
  ]
  let k = 0
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i++) {
      const wk = order[k++]
      const img = imgs[WORKS.indexOf(wk)]
      const ang = (i / ring.n) * Math.PI * 2 + (ring.n === 18 ? 0.17 : 0)
      const w = ring.s * 1.45
      const h = ring.s
      items.push({ img, ang, r: ring.r, w, h, glow: 0, src: img ? coverRect(img, w, h) : null })
    }
  }
}

const angleAt = e => Math.atan2(e.clientY - vh / 2, e.clientX - vw / 2)

canvas.addEventListener("pointerdown", e => {
  dragging = true
  canvas.classList.add("is-dragging")
  canvas.setPointerCapture(e.pointerId)
  lastA = angleAt(e)
  lastT = performance.now()
  vel = 0
})
canvas.addEventListener("pointermove", e => {
  if (!dragging) return
  const a = angleAt(e)
  let dA = a - lastA
  if (dA > Math.PI) dA -= Math.PI * 2
  if (dA < -Math.PI) dA += Math.PI * 2
  const now = performance.now()
  const dt = Math.max(8, now - lastT) / 1000
  sweep += dA
  vel = vel * 0.5 + (dA / dt) * 0.5
  lastA = a
  lastT = now
})
const end = () => {
  dragging = false
  canvas.classList.remove("is-dragging")
}
canvas.addEventListener("pointerup", end)
canvas.addEventListener("pointercancel", end)

const TAU = Math.PI * 2
const norm = a => ((a % TAU) + TAU) % TAU

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  if (!dragging) {
    sweep += vel * dt
    // momentum decays back to the patrol speed
    const target = REDUCED ? 0 : 0.55
    vel += (target - vel) * Math.min(1, dt * 0.9)
  }

  const cx = vw / 2
  const cy = vh / 2
  const vmin = Math.min(vw, vh)

  ctx.fillStyle = "#05080a"
  ctx.fillRect(0, 0, vw, vh)

  // ring guides + tick dots
  ctx.strokeStyle = "rgba(140, 220, 180, 0.10)"
  ctx.lineWidth = 1
  for (const r of [vmin * 0.26, vmin * 0.43, vmin * 0.14]) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, TAU)
    ctx.stroke()
  }

  // the beam — conic fade behind the sweep line
  const a = norm(sweep)
  if (ctx.createConicGradient) {
    const g = ctx.createConicGradient(a - 0.9, cx, cy)
    g.addColorStop(0, "rgba(140, 230, 180, 0)")
    g.addColorStop(0.13, "rgba(140, 230, 180, 0.16)")
    g.addColorStop(0.145, "rgba(180, 255, 210, 0.30)")
    g.addColorStop(0.16, "rgba(140, 230, 180, 0)")
    g.addColorStop(1, "rgba(140, 230, 180, 0)")
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, vmin * 0.52, 0, TAU)
    ctx.fill()
  } else {
    ctx.strokeStyle = "rgba(180, 255, 210, 0.35)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(a) * vmin * 0.52, cy + Math.sin(a) * vmin * 0.52)
    ctx.stroke()
  }

  // works: light up as the beam passes, cool down after
  for (const it of items) {
    let d = Math.abs(norm(it.ang) - a)
    if (d > Math.PI) d = TAU - d
    if (d < 0.07) it.glow = 1
    it.glow = Math.max(0, it.glow - dt * 0.42)

    const x = cx + Math.cos(it.ang) * it.r
    const y = cy + Math.sin(it.ang) * it.r
    const s = 1 + it.glow * 0.14
    const w = it.w * s
    const h = it.h * s
    ctx.globalAlpha = 0.1 + it.glow * 0.9
    if (it.img && it.img.naturalWidth) {
      const [sx, sy, sw, sh] = it.src
      ctx.drawImage(it.img, sx, sy, sw, sh, x - w / 2, y - h / 2, w, h)
    }
    ctx.globalAlpha = 1
  }

  // centre dot
  ctx.fillStyle = "rgba(180, 255, 210, 0.5)"
  ctx.beginPath()
  ctx.arc(cx, cy, 3, 0, TAU)
  ctx.fill()

  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) build()
  }, 200)
})

mountNav(37)
onViewport(async () => {
  imgs = await loadAll(WORKS)
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
