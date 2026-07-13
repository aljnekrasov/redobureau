import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Duncis 061 — experimental. A slit-scan: the screen keeps only a single
// moving slice of each work and lets the rest smear sideways through time,
// so the portfolio stretches into long ribbons of colour that resolve for a
// moment as a recognisable frame, then pull apart again. The cursor's height
// bends the slit up and down, shearing the ribbons.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

const src = document.createElement("canvas")
const sctx = src.getContext("2d")

const STEP = 8 // px added at the right edge each frame

let vw = 0
let vh = 0
let imgs = []
let order = []
let cur = 0
let scan = 0 // 0..1 across the current work
let hold = 0
let my = 0.5

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  src.width = vw
  src.height = vh
  ctx.fillStyle = "#050506"
  ctx.fillRect(0, 0, vw, vh)
  drawSrc()
}

function drawSrc() {
  const img = imgs[order[cur]]
  sctx.fillStyle = "#050506"
  sctx.fillRect(0, 0, vw, vh)
  if (img && img.naturalWidth) coverDraw(sctx, img, 0, 0, vw, vh)
}

addEventListener("pointermove", e => (my = e.clientY / innerHeight))

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  // advance the read-head across the work; next work when it reaches the end
  if (!REDUCED) {
    scan += dt * 0.14
    if (scan >= 1) {
      scan = 0
      cur = (cur + 1) % order.length
      drawSrc()
    }
  }

  // shift everything left by STEP
  ctx.drawImage(canvas, STEP, 0, vw - STEP, vh, 0, 0, vw - STEP, vh)

  // draw a fresh slice at the right edge, sampled from the work's scan column,
  // sheared vertically by the cursor for the slit-scan warp
  const sx = Math.min(vw - 1, scan * vw)
  const shear = (my - 0.5) * vh * 0.5
  ctx.drawImage(src, sx, 0, 1, vh, vw - STEP, shear, STEP, vh)
  // fade the far-left (oldest) so ribbons dissolve into the dark
  ctx.fillStyle = "rgba(5,5,6,0.012)"
  ctx.fillRect(0, 0, vw, vh)

  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(32)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 62).map(w => WORKS.indexOf(w))
  drawSrc()
  prev = performance.now()
  requestAnimationFrame(frame)
})
