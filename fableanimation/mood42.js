import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Karogs 071: each work raised as a flag. The cloth hangs off a pole at the
// left and ripples in the wind — vertical slices ride a travelling wave
// whose swing grows toward the free edge, with light and shade rolling
// along the folds. Move the cursor fast to gust the wind; click to hoist
// the next work.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

const A = document.createElement("canvas")
const actx = A.getContext("2d")
const B = document.createElement("canvas")
const bctx = B.getContext("2d")

const SLICES = 84

let vw = 0
let vh = 0
let fx = 0 // flag rect
let fy = 0
let fw = 0
let fh = 0
let imgs = []
let order = []
let cur = 0
let fade = 1 // 1 = settled on cur; <1 blending cur→cur+1
let hold = 0
let t = 0
let energy = 0
let lastX = null
let lastMoveT = 0

function paint(cv, cx, pos) {
  const img = imgs[order[((pos % order.length) + order.length) % order.length]]
  cx.fillStyle = "#101116"
  cx.fillRect(0, 0, cv.width, cv.height)
  if (img && img.naturalWidth) coverDraw(cx, img, 0, 0, cv.width, cv.height)
}

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  fw = vw * 0.66
  fh = Math.min(vh * 0.58, fw * 0.62)
  fx = vw * 0.17
  fy = (vh - fh) / 2
  A.width = B.width = Math.round(fw)
  A.height = B.height = Math.round(fh)
  if (imgs.length) {
    paint(A, actx, cur)
    paint(B, bctx, cur + 1)
  }
}

addEventListener("pointermove", e => {
  const now = performance.now()
  if (lastX != null) {
    const dt = Math.max(8, now - lastMoveT)
    energy = Math.min(2.2, energy + (Math.abs(e.clientX - lastX) / dt) * 0.55)
  }
  lastX = e.clientX
  lastMoveT = now
})
addEventListener("pointerdown", () => {
  energy = Math.min(2.4, energy + 1.1)
  if (fade >= 1) fade = 0 // hoist the next work
})

function drawFlag(cv, alpha, tt, amp) {
  const sw = cv.width / SLICES
  for (let i = 0; i < SLICES; i++) {
    const u = i / (SLICES - 1)
    const reach = 0.12 + u * 0.88 // free edge swings most
    const ph = u * 4.6 - tt * 3.1
    const dy = Math.sin(ph) * amp * reach
    const x = fx + u * fw
    ctx.globalAlpha = alpha
    ctx.drawImage(cv, i * sw, 0, sw, cv.height, x, fy + dy, sw + 1.2, fh)
    // rolling shade along the folds
    const shade = Math.cos(ph)
    ctx.fillStyle = shade > 0 ? `rgba(0,0,0,${(shade * 0.20 * alpha).toFixed(3)})` : `rgba(255,255,255,${(-shade * 0.05 * alpha).toFixed(3)})`
    ctx.fillRect(x, fy + dy, sw + 1.2, fh)
  }
  ctx.globalAlpha = 1
}

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt * (REDUCED ? 0.25 : 1)
  energy *= Math.pow(0.4, dt)

  if (!REDUCED && fade >= 1) {
    hold += dt
    if (hold > 4.2) {
      hold = 0
      fade = 0
    }
  }
  if (fade < 1) {
    fade = Math.min(1, fade + dt / 0.9)
    if (fade >= 1) {
      cur += 1
      paint(A, actx, cur)
      paint(B, bctx, cur + 1)
    }
  }

  ctx.clearRect(0, 0, vw, vh)

  // pole
  ctx.fillStyle = "rgba(210, 215, 225, 0.5)"
  ctx.fillRect(fx - 6, fy - vh * 0.12, 3, fh + vh * 0.24)
  ctx.beginPath()
  ctx.arc(fx - 4.5, fy - vh * 0.12, 5, 0, 6.2832)
  ctx.fill()

  const amp = fh * (0.045 + 0.05 * energy)
  if (fade < 1) {
    drawFlag(A, 1, t, amp)
    drawFlag(B, fade, t + 0.35, amp)
  } else {
    drawFlag(A, 1, t, amp)
  }

  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(42)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 72).map(w => WORKS.indexOf(w))
  paint(A, actx, cur)
  paint(B, bctx, cur + 1)
  prev = performance.now()
  requestAnimationFrame(frame)
})
