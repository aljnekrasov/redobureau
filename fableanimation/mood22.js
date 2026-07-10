import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Matrica 051 — experimental. The portfolio played back on a giant LED wall:
// each work resolved to a grid of glowing round pixels, brightness and
// colour straight from the photograph, blooming softly on the black panel.
// It cross-fades from work to work; the cursor drags a brighter sweep of
// current across the diodes.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

const PITCH = 15 // LED spacing
const led = document.createElement("canvas") // where the diodes are drawn
const lx = led.getContext("2d")
const src = document.createElement("canvas") // full-res crossfading work
const sx = src.getContext("2d")
const grid = document.createElement("canvas") // downsample buffer
const gx = grid.getContext("2d")

let vw = 0
let vh = 0
let gw = 0
let gh = 0
let imgs = []
let order = []
let cur = 0
let fade = 1
let hold = 0
let mx = -1e3
let my = -1e3
let t = 0

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  led.width = vw
  led.height = vh
  src.width = vw
  src.height = vh
  gw = Math.ceil(vw / PITCH)
  gh = Math.ceil(vh / PITCH)
  grid.width = gw
  grid.height = gh
}

function drawWork(i) {
  const img = imgs[order[i % order.length]]
  if (img && img.naturalWidth) coverDraw(sx, img, 0, 0, vw, vh)
}

addEventListener("pointermove", e => {
  mx = e.clientX
  my = e.clientY
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt

  if (!REDUCED) {
    if (fade >= 1) {
      hold += dt
      if (hold > 3.0) {
        hold = 0
        fade = 0
      }
    } else {
      fade = Math.min(1, fade + dt / 0.9)
      if (fade >= 1) cur = (cur + 1) % order.length
    }
  }

  // compose the current work (crossfading to next) then sample its tone
  sx.globalAlpha = 1
  drawWork(cur)
  if (fade < 1) {
    sx.globalAlpha = fade
    drawWork(cur + 1)
    sx.globalAlpha = 1
  }
  gx.drawImage(src, 0, 0, gw, gh)
  const px = gx.getImageData(0, 0, gw, gh).data

  // draw the diodes on the panel
  lx.fillStyle = "#050506"
  lx.fillRect(0, 0, vw, vh)
  const R = PITCH * 0.46
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const o = (j * gw + i) * 4
      const r = px[o]
      const g = px[o + 1]
      const b = px[o + 2]
      const lum = (r + g + b) / 765
      if (lum < 0.05) continue
      const cx = i * PITCH + PITCH / 2
      const cy = j * PITCH + PITCH / 2
      // cursor sweep pushes those diodes hotter
      const near = Math.max(0, 1 - Math.hypot(cx - mx, cy - my) / 170)
      const boost = 1 + near * 0.6
      const rad = R * (0.4 + lum * 0.6)
      lx.fillStyle = `rgb(${Math.min(255, r * boost) | 0},${Math.min(255, g * boost) | 0},${Math.min(255, b * boost) | 0})`
      lx.beginPath()
      lx.arc(cx, cy, rad, 0, 6.2832)
      lx.fill()
    }
  }

  // panel + bloom
  ctx.globalCompositeOperation = "source-over"
  ctx.fillStyle = "#050506"
  ctx.fillRect(0, 0, vw, vh)
  ctx.drawImage(led, 0, 0)
  ctx.globalCompositeOperation = "lighter"
  ctx.filter = "blur(7px)"
  ctx.globalAlpha = 0.75
  ctx.drawImage(led, 0, 0)
  ctx.filter = "none"
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = "source-over"

  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(22)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 51).map(w => WORKS.indexOf(w))
  prev = performance.now()
  requestAnimationFrame(frame)
})
