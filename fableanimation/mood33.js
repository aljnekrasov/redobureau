import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Mērogs 062 — experimental. A Droste zoom: every work hangs framed inside
// the one before it, smaller and smaller toward the centre, and the whole
// nest glides endlessly inward — you fall through the portfolio, each piece
// swelling to fill the screen before you drop into the next. Wheel to dive
// faster or pull back out.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

const LEVELS = 7
const RATIO = 0.56 // each inner frame is this fraction of its parent

let vw = 0
let vh = 0
let imgs = []
let order = []
let base = 0
let phase = 0 // 0..1, wraps to advance one level
let speed = 0.16
let speedT = 0.16

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
}

function drawFrame(workPos, size) {
  const img = imgs[order[((workPos % order.length) + order.length) % order.length]]
  const x = (vw - size) / 2
  const y = (vh - size * (vh / vw)) / 2
  const h = size * (vh / vw)
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, size, h)
  ctx.clip()
  ctx.fillStyle = "#0c0c10"
  ctx.fillRect(x, y, size, h)
  if (img && img.naturalWidth) coverDraw(ctx, img, x, y, size, h)
  ctx.restore()
  // thin frame line to read the nesting
  ctx.strokeStyle = "rgba(0,0,0,0.5)"
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, size, h)
}

addEventListener(
  "wheel",
  e => {
    e.preventDefault()
    speedT = Math.max(-0.6, Math.min(0.7, speedT - e.deltaY * 0.0006))
  },
  { passive: false }
)

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  speed += (speedT - speed) * Math.min(1, dt * 3)
  if (!REDUCED) phase += speed * dt
  while (phase >= 1) {
    phase -= 1
    base += 1
  }
  while (phase < 0) {
    phase += 1
    base -= 1
  }

  // continuous zoom: as phase 0→1 the whole nest grows by 1/RATIO
  const grow = Math.pow(1 / RATIO, phase)
  const maxDim = Math.max(vw, vh) * 1.15

  ctx.fillStyle = "#060608"
  ctx.fillRect(0, 0, vw, vh)
  // largest frame first, then each smaller one nested on top toward the
  // centre — picture within a picture within a picture
  for (let k = 0; k < LEVELS; k++) {
    const size = maxDim * Math.pow(RATIO, k) * grow
    if (size < 6) continue
    drawFrame(base - k, size)
  }

  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(33)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 63).map(w => WORKS.indexOf(w))
  prev = performance.now()
  requestAnimationFrame(frame)
})
