import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Punkti 041 — experimental. The portfolio printed as newsprint: one work
// at a time, dissolved into a field of ink dots whose size follows the
// tone underneath, cream paper behind. It cross-fades slowly from work to
// work. Your cursor is a loupe — a disc of clean, full-colour photograph
// gliding over the halftone. No type, just dots and one sharp circle.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

const CREAM = "#ece7db"
const INK = "#17130f"
const SP = 9 // dot pitch in px

let vw = 0
let vh = 0
let gw = 0
let gh = 0

// offscreen full-res render of the current (cross-fading) work
const src = document.createElement("canvas")
const sctx = src.getContext("2d")
// tiny buffer we sample tone from
const grid = document.createElement("canvas")
const gctx = grid.getContext("2d")

let imgs = []
let order = []
let cur = 0
let fade = 1 // 1 = settled on cur, <1 = blending toward next
let hold = 0

let mx = -1e3
let my = -1e3
let idle = 0
let t = 0

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  src.width = vw
  src.height = vh
  gw = Math.ceil(vw / SP)
  gh = Math.ceil(vh / SP)
  grid.width = gw
  grid.height = gh
}

function drawWork(i) {
  const img = imgs[order[i % order.length]]
  if (img && img.naturalWidth) coverDraw(sctx, img, 0, 0, vw, vh)
}

addEventListener("pointermove", e => {
  mx = e.clientX
  my = e.clientY
  idle = 0
})
addEventListener("pointerdown", () => {
  // tap advances
  fade = Math.min(fade, 0.999)
  hold = 99
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt
  idle += dt

  // advance the slideshow
  if (!REDUCED) {
    if (fade >= 1) {
      hold += dt
      if (hold > 3.2) {
        hold = 0
        fade = 0 // start blending to next
      }
    } else {
      fade = Math.min(1, fade + dt / 0.9)
      if (fade >= 1) cur = (cur + 1) % order.length
    }
  }

  // paint current work (with next fading in) into src
  sctx.globalAlpha = 1
  drawWork(cur)
  if (fade < 1) {
    sctx.globalAlpha = fade
    drawWork(cur + 1)
    sctx.globalAlpha = 1
  }

  // downsample for tone
  gctx.drawImage(src, 0, 0, gw, gh)
  const px = gctx.getImageData(0, 0, gw, gh).data

  // paper + ink dots
  ctx.fillStyle = CREAM
  ctx.fillRect(0, 0, vw, vh)
  ctx.fillStyle = INK
  const wob = REDUCED ? 0 : Math.sin(t * 0.4) * 0.4
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const o = (j * gw + i) * 4
      // perceptual luma
      const lum = (px[o] * 0.299 + px[o + 1] * 0.587 + px[o + 2] * 0.114) / 255
      const rad = (1 - lum) * SP * 0.62 + wob
      if (rad > 0.35) {
        ctx.beginPath()
        ctx.arc(i * SP + SP / 2, j * SP + SP / 2, rad, 0, 6.2832)
        ctx.fill()
      }
    }
  }

  // the loupe: a clean disc of the real photograph
  if (idle > 2.2 && !REDUCED) {
    mx = vw * (0.5 + 0.34 * Math.sin(t * 0.33))
    my = vh * (0.5 + 0.3 * Math.cos(t * 0.25))
  }
  if (mx > -1e2) {
    const R = Math.min(vw, vh) * 0.15
    ctx.save()
    ctx.beginPath()
    ctx.arc(mx, my, R, 0, 6.2832)
    ctx.clip()
    ctx.drawImage(src, 0, 0)
    ctx.restore()
    ctx.beginPath()
    ctx.arc(mx, my, R, 0, 6.2832)
    ctx.lineWidth = 2
    ctx.strokeStyle = "rgba(20,16,12,0.55)"
    ctx.stroke()
  }

  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(12)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 19).map(w => WORKS.indexOf(w))
  prev = performance.now()
  requestAnimationFrame(frame)
})
