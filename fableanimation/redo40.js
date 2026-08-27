// Mozaika: the mark laid out as a living stained-glass mosaic. The logo
// silhouette is filled with a grid of small tiles, each tile a random crop
// of a Nano Banana stained-glass texture. A wavefront keeps sweeping across
// the word: as it passes, tiles flip around their vertical axis and land
// with a fresh shard of glass, so the mark constantly re-tessellates itself
// without ever losing its shape. The cursor flips tiles under it.

const canvas = document.getElementById("scene_root")
const ctx = canvas.getContext("2d")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = -1e4, mouseY = -1e4

// -- sources ----------------------------------------------------------------------------

let glass = null
const glassImg = new Image()
glassImg.onload = () => {
  // backlight the glass: brighten once into an offscreen
  const c = document.createElement("canvas")
  c.width = glassImg.width; c.height = glassImg.height
  const g = c.getContext("2d")
  g.filter = "brightness(1.75) saturate(1.35)"
  g.drawImage(glassImg, 0, 0)
  glass = c
  buildCells()
}
glassImg.src = "nano-glass.png"

let maskData = null
const MW = 1024, MH = 280
fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#fff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = MW; c.height = MH
    const g = c.getContext("2d")
    const s = Math.min((MW * 0.94) / img.width, (MH * 0.86) / img.height)
    const dw = img.width * s, dh = img.height * s
    g.drawImage(img, (MW - dw) / 2, (MH - dh) / 2, dw, dh)
    maskData = g.getImageData(0, 0, MW, MH).data
    URL.revokeObjectURL(url)
    buildCells()
  }
  img.src = url
})

// -- the tile field -----------------------------------------------------------------------

let cells = []
let CS = 14
const rect = { x: 0, y: 0, w: 100, h: 100 }

function maskAt(u, v) {
  if (u < 0 || u >= 1 || v < 0 || v >= 1 || !maskData) return 0
  const x = (u * MW) | 0, y = (v * MH) | 0
  return maskData[(y * MW + x) * 4 + 3]
}

function buildCells() {
  if (!maskData || !glass) return
  rect.w = width * 0.8
  rect.h = rect.w * (MH / MW)
  rect.x = (width - rect.w) / 2
  rect.y = (height - rect.h) / 2
  CS = Math.max(9, Math.round(rect.w / 74))

  cells = []
  const gs = glass.width
  for (let y = rect.y; y < rect.y + rect.h; y += CS) {
    for (let x = rect.x; x < rect.x + rect.w; x += CS) {
      const u = (x + CS / 2 - rect.x) / rect.w
      const v = (y + CS / 2 - rect.y) / rect.h
      if (maskAt(u, v) > 100) {
        cells.push({
          x, y,
          sx: Math.random() * (gs - 64), sy: Math.random() * (gs - 64),
          nx: 0, ny: 0,
          p: 1,                             // flip progress, 1 = at rest
          shade: 0.85 + Math.random() * 0.3,
          last: -10
        })
      }
    }
  }
}

// -- sizing / input --------------------------------------------------------------------------

function applySize() {
  width = window.innerWidth || width
  height = window.innerHeight || height
  canvas.width = width; canvas.height = height
  buildCells()
}
applySize()
window.addEventListener("resize", applySize)
window.addEventListener("mousemove", e => { mouseX = e.clientX; mouseY = e.clientY })

// -- loop -------------------------------------------------------------------------------------

let t = 0
let last = performance.now()
const FLIP = 0.55                            // seconds per flip

function trigger(c, now) {
  if (c.p < 1 || now - c.last < 1.2) return
  c.p = 0
  c.last = now
  const gs = glass.width
  c.nx = Math.random() * (gs - 64)
  c.ny = Math.random() * (gs - 64)
}

function step(dt) {
  t += dt
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, width, height)
  if (!cells.length) return

  // the sweeping wavefront: rolls across the word, tilted a little
  const period = 7
  const front = ((t % period) / period) * (rect.w + 300) - 150 + rect.x

  for (const c of cells) {
    const fx = front + (c.y - rect.y) * 0.35
    if (Math.abs(c.x - fx) < CS) trigger(c, t)
    const dx = c.x + CS / 2 - mouseX, dy = c.y + CS / 2 - mouseY
    if (dx * dx + dy * dy < 8100) trigger(c, t)

    if (c.p < 1) {
      c.p = Math.min(1, c.p + dt / FLIP)
      if (c.p >= 0.5 && c.nx !== null) { c.sx = c.nx; c.sy = c.ny; c.nx = null }
    } else {
      c.nx = c.nx === null ? c.sx : c.nx
    }

    const sc = Math.abs(Math.cos(Math.PI * c.p))
    const w = Math.max(0.5, CS * (c.p < 1 ? sc : 1))
    ctx.globalAlpha = c.shade
    ctx.drawImage(glass, c.sx, c.sy, 64, 64, c.x + (CS - w) / 2, c.y, w, CS)
  }
  ctx.globalAlpha = 1

  // thin lead lines between tiles: dark grid overlay inside the mark
  ctx.fillStyle = "rgba(0,0,0,0.25)"
  for (const c of cells) ctx.fillRect(c.x, c.y, CS, 1)
}

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  step(dt)
}
requestAnimationFrame(frame)

window.__fable = { get t() { return t }, set t(v) { t = v }, step }
