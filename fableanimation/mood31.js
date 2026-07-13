import { WORKS, REDUCED, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Sietspiede 060 — experimental. Each work run through a risograph: reduced
// to two spot inks on coloured stock, the plates a hair out of register so
// the colours ghost past each other, the whole thing peppered with print
// grain. It changes work and palette every few seconds. Click to reprint
// the current one in a new pair of inks.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

// paper + two inks per palette
const PALETTES = [
  ["#ece3cf", "#2b2b78", "#e64a3b"],
  ["#e9e3d5", "#1c1c1c", "#f24d7a"],
  ["#efe7d6", "#173d2f", "#e88b2f"],
  ["#e6e6e6", "#243b8f", "#f0b400"],
  ["#f0e9dc", "#7a1f45", "#2aa39a"],
]

const src = document.createElement("canvas")
const sctx = src.getContext("2d")
const plate = document.createElement("canvas") // duotone result
const pctx = plate.getContext("2d")
let grain = null

let vw = 0
let vh = 0
let imgs = []
let order = []
let cur = 0
let pal = 0
let hold = 0
let jitter = 6
let t = 0

function makeGrain(w, h) {
  const g = document.createElement("canvas")
  g.width = w
  g.height = h
  const gx = g.getContext("2d")
  const id = gx.createImageData(w, h)
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 118 + ((i * 2654435761) % 90)
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v
    id.data[i + 3] = 26
  }
  gx.putImageData(id, 0, 0)
  return g
}

function hexRGB(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}

// duotone the current work into `plate`
function print() {
  const [, inkA, inkB] = PALETTES[pal]
  const A = hexRGB(inkA)
  const B = hexRGB(inkB)
  const img = imgs[order[cur]]
  const pw = plate.width
  const ph = plate.height
  sctx.fillStyle = "#fff"
  sctx.fillRect(0, 0, pw, ph)
  if (img && img.naturalWidth) coverDraw(sctx, img, 0, 0, pw, ph)
  const data = sctx.getImageData(0, 0, pw, ph)
  const d = data.data
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255
    // dark ink in shadows, accent ink in highlights
    const k = Math.pow(lum, 1.1)
    d[i] = A[0] + (B[0] - A[0]) * k
    d[i + 1] = A[1] + (B[1] - A[1]) * k
    d[i + 2] = A[2] + (B[2] - A[2]) * k
  }
  pctx.putImageData(data, 0, 0)
}

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  const pw = Math.min(1100, vw)
  const ph = Math.round(pw * (vh / vw))
  src.width = plate.width = pw
  src.height = plate.height = ph
  grain = makeGrain(Math.ceil(vw / 2), Math.ceil(vh / 2))
  if (imgs.length) print()
}

canvas.addEventListener("pointerdown", () => {
  pal = (pal + 1) % PALETTES.length
  print()
  hold = 0
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += dt

  if (!REDUCED) {
    hold += dt
    if (hold > 3.4) {
      hold = 0
      cur = (cur + 1) % order.length
      pal = (pal + 1) % PALETTES.length
      print()
    }
  }

  const paper = PALETTES[pal][0]
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, vw, vh)

  // wobble the registration a touch each frame
  const jx = Math.sin(t * 1.7) * jitter
  const jy = Math.cos(t * 1.3) * jitter * 0.6

  // second plate, offset and screen-blended → the classic mis-register ghost
  ctx.globalAlpha = 0.55
  ctx.globalCompositeOperation = "multiply"
  ctx.drawImage(plate, jx, jy, vw, vh)
  ctx.globalCompositeOperation = "screen"
  ctx.globalAlpha = 0.35
  ctx.drawImage(plate, -jx * 1.3, -jy * 1.3, vw, vh)
  ctx.globalCompositeOperation = "source-over"
  ctx.globalAlpha = 1

  // main plate on top
  ctx.globalAlpha = 0.9
  ctx.drawImage(plate, 0, 0, vw, vh)
  ctx.globalAlpha = 1

  // print grain
  ctx.globalCompositeOperation = "overlay"
  ctx.drawImage(grain, (t * 40) % 20 - 20, (t * 25) % 20 - 20, vw, vh)
  ctx.globalCompositeOperation = "source-over"

  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(31)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 61).map(w => WORKS.indexOf(w))
  print()
  prev = performance.now()
  requestAnimationFrame(frame)
})
