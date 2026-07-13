import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Skeneris 068: a photocopier working through the portfolio. A bright
// scanning bar glides down the glass; above it the fresh work is already
// printed, below it the old one still shows. Reach in and drag the bar
// yourself — scrub the swap back and forth — then let go and the machine
// carries on.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

const A = document.createElement("canvas") // old work
const actx = A.getContext("2d")
const B = document.createElement("canvas") // new work, revealed above the bar
const bctx = B.getContext("2d")

let vw = 0
let vh = 0
let imgs = []
let order = []
let cur = 0
let scanY = 0
let hold = -0.4
let dragging = false

function paint(cv, cx, pos) {
  const img = imgs[order[((pos % order.length) + order.length) % order.length]]
  cx.fillStyle = "#0c0c0e"
  cx.fillRect(0, 0, cv.width, cv.height)
  if (img && img.naturalWidth) coverDraw(cx, img, 0, 0, cv.width, cv.height)
}

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = A.width = B.width = vw
  canvas.height = A.height = B.height = vh
  if (imgs.length) {
    paint(A, actx, cur)
    paint(B, bctx, cur + 1)
  }
}

canvas.addEventListener("pointerdown", e => {
  dragging = true
  canvas.setPointerCapture(e.pointerId)
  scanY = e.clientY
})
canvas.addEventListener("pointermove", e => {
  if (dragging) scanY = Math.max(0, Math.min(vh, e.clientY))
})
const end = () => (dragging = false)
canvas.addEventListener("pointerup", end)
canvas.addEventListener("pointercancel", end)

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  if (!dragging && !REDUCED) {
    if (hold < 0) hold += dt
    else scanY += vh * 0.30 * dt
  }
  if (scanY >= vh) {
    // page done: the new work becomes the old, load the next
    cur += 1
    paint(A, actx, cur)
    paint(B, bctx, cur + 1)
    scanY = 0
    hold = -0.9
  }

  ctx.drawImage(A, 0, 0)
  if (scanY > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, vw, scanY)
    ctx.clip()
    ctx.drawImage(B, 0, 0)
    ctx.restore()
  }

  // the light bar
  const g = ctx.createLinearGradient(0, scanY - 90, 0, scanY + 14)
  g.addColorStop(0, "rgba(150, 255, 230, 0)")
  g.addColorStop(0.85, "rgba(150, 255, 230, 0.20)")
  g.addColorStop(1, "rgba(150, 255, 230, 0)")
  ctx.fillStyle = g
  ctx.fillRect(0, scanY - 90, vw, 104)
  ctx.fillStyle = "rgba(220, 255, 245, 0.85)"
  ctx.fillRect(0, scanY - 1, vw, 2.5)

  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(39)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 69).map(w => WORKS.indexOf(w))
  paint(A, actx, cur)
  paint(B, bctx, cur + 1)
  prev = performance.now()
  requestAnimationFrame(frame)
})
