import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Tekstils 063 — experimental. Two works woven into one cloth: one is cut
// into horizontal ribbons, the other into vertical, and they pass over and
// under each other on a checkerboard so the pair basket-weaves together.
// The weave slides slowly and the two works keep changing, like a loom
// running. Click to swap the warp and weft.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

const N = 11 // ribbons each way
const A = document.createElement("canvas")
const actx = A.getContext("2d")
const B = document.createElement("canvas")
const bctx = B.getContext("2d")

let vw = 0
let vh = 0
let imgs = []
let order = []
let ia = 0
let ib = 1
let hold = 0
let t = 0

function paint(cv, cx, workPos) {
  const img = imgs[order[workPos % order.length]]
  cx.fillStyle = "#111"
  cx.fillRect(0, 0, cv.width, cv.height)
  if (img && img.naturalWidth) coverDraw(cx, img, 0, 0, cv.width, cv.height)
}

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  A.width = B.width = vw
  A.height = B.height = vh
  if (imgs.length) {
    paint(A, actx, ia)
    paint(B, bctx, ib)
  }
}

canvas.addEventListener("pointerdown", () => {
  const t2 = ia
  ia = ib
  ib = t2
  paint(A, actx, ia)
  paint(B, bctx, ib)
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += REDUCED ? 0 : dt

  if (!REDUCED) {
    hold += dt
    if (hold > 3.6) {
      hold = 0
      ia = ib
      ib = (ib + 1) % order.length
      paint(A, actx, ia)
      paint(B, bctx, ib)
    }
  }

  const cw = vw / N
  const ch = vh / N
  const off = Math.sin(t * 0.5) * 4 // gentle loom sway

  ctx.fillStyle = "#0b0b0d"
  ctx.fillRect(0, 0, vw, vh)
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const x = c * cw
      const y = r * ch
      // checkerboard decides which thread is on top in this cell
      const over = (r + c) % 2 === 0
      const cv = over ? A : B
      // ribbons lift a touch when they cross over → the sway offset
      const dx = over ? off : -off
      ctx.drawImage(cv, x + dx, y, cw + 1, ch + 1, x, y, cw + 1, ch + 1)
      // shade the cell edges for an over/under relief
      ctx.fillStyle = over ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.05)"
      ctx.fillRect(x, y, cw + 1, 2)
      ctx.fillRect(x, y, 2, ch + 1)
    }
  }

  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(34)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 64).map(w => WORKS.indexOf(w))
  paint(A, actx, ia)
  paint(B, bctx, ib)
  prev = performance.now()
  requestAnimationFrame(frame)
})
