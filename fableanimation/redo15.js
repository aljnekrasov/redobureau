// Ēnas: the redo logotype as a gallery light object. A pale wall, the mark
// glowing soft warm white, and four spotlights hitting it from four
// directions — their shadows fall as overlapping grey petals that breathe
// as the lamps sway. Moving the cursor walks the light rig around, the way
// the reference video pans past the installation. Pure canvas 2d.

const VIEW = { x: 79.6, y: 765.86, w: 1840.49, h: 468.42 }

// four spots: base shadow directions (radians) and sway rhythms
const LIGHTS = [
  { angle: Math.PI * 0.25, dist: 0.30, sway: 0.21, phase: 0.0, alpha: 0.18 },
  { angle: Math.PI * 0.75, dist: 0.36, sway: 0.17, phase: 1.7, alpha: 0.16 },
  { angle: Math.PI * 1.25, dist: 0.33, sway: 0.24, phase: 3.1, alpha: 0.17 },
  { angle: Math.PI * 1.75, dist: 0.38, sway: 0.15, phase: 4.6, alpha: 0.15 }
]

const canvas = document.getElementById("scene_root")
const ctx = canvas.getContext("2d")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0
let mouseY = 0

// -- sprites --------------------------------------------------------------------------

let logoPaths = null
let sprites = null // { shadow, logo, bloom, w, h, pad }

fetch("redo-logo.svg")
  .then(r => r.text())
  .then(svg => {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml")
    logoPaths = []
    for (const el of doc.querySelectorAll("path")) {
      logoPaths.push(new Path2D(el.getAttribute("d")))
    }
    for (const el of doc.querySelectorAll("circle")) {
      const p = new Path2D()
      p.arc(+el.getAttribute("cx"), +el.getAttribute("cy"), +el.getAttribute("r"), 0, Math.PI * 2)
      logoPaths.push(p)
    }
    buildSprites()
  })

function buildSprites() {
  if (!logoPaths) return

  const logoW = Math.min(width * 0.54, height * 0.9 * (VIEW.w / VIEW.h))
  const s = logoW / VIEW.w
  const logoH = VIEW.h * s
  const pad = Math.ceil(logoW * 0.09)
  const w = Math.ceil(logoW + pad * 2)
  const h = Math.ceil(logoH + pad * 2)

  function renderMark(fillStyle) {
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const g = c.getContext("2d")
    g.setTransform(s, 0, 0, s, pad - VIEW.x * s, pad - VIEW.y * s)
    g.fillStyle = fillStyle
    for (const p of logoPaths) g.fill(p)
    return c
  }

  // the soft grey petal: the mark blurred well past its edge
  const shadowSharp = renderMark("#5e6670")
  const shadow = document.createElement("canvas")
  shadow.width = w
  shadow.height = h
  const sg = shadow.getContext("2d")
  sg.filter = `blur(${Math.max(6, logoW * 0.02)}px)`
  sg.drawImage(shadowSharp, 0, 0)

  // the glowing body: warm paper white with a light pool upper right
  const logo = renderMark("#f6f3ea")
  const lg = logo.getContext("2d")
  lg.globalCompositeOperation = "source-atop"
  const pool = lg.createRadialGradient(w * 0.62, h * 0.3, 0, w * 0.62, h * 0.3, w * 0.5)
  pool.addColorStop(0, "rgba(255, 253, 244, 0.85)")
  pool.addColorStop(1, "rgba(255, 253, 244, 0)")
  lg.fillStyle = pool
  lg.fillRect(0, 0, w, h)

  // faint halo so the mark reads as lit from within
  const bloom = document.createElement("canvas")
  bloom.width = w
  bloom.height = h
  const bg = bloom.getContext("2d")
  bg.filter = `blur(${Math.max(8, logoW * 0.03)}px)`
  bg.drawImage(renderMark("#fffdf4"), 0, 0)

  sprites = { shadow, logo, bloom, w, h }
}

// -- sizing ---------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  // dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
  canvas.width = width
  canvas.height = height
  buildSprites()
}

applySize()
window.addEventListener("resize", applySize, false)

// -- interaction ----------------------------------------------------------------------

window.addEventListener("mousemove", e => {
  mouseX = (e.clientX / width - 0.5) * 2
  mouseY = (e.clientY / height - 0.5) * 2
})

// -- loop -----------------------------------------------------------------------------

let start = performance.now()

function draw(now) {
  requestAnimationFrame(draw)
  const t = (now - start) / 1000

  // gallery wall with a breath of light behind the mark, floor below
  const floorY = height * 0.78
  const wall = ctx.createRadialGradient(
    width * 0.5, height * 0.42, height * 0.05,
    width * 0.5, height * 0.5, height * 0.95
  )
  wall.addColorStop(0, "#e3e2de")
  wall.addColorStop(0.55, "#d6d5d1")
  wall.addColorStop(1, "#c3c2be")
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.fillStyle = wall
  ctx.fillRect(0, 0, width, height)

  const floor = ctx.createLinearGradient(0, floorY, 0, height)
  floor.addColorStop(0, "#c9c7c1")
  floor.addColorStop(1, "#b5b2ab")
  ctx.fillStyle = floor
  ctx.fillRect(0, floorY, width, height - floorY)
  ctx.fillStyle = "rgba(0, 0, 0, 0.05)"
  ctx.fillRect(0, floorY, width, 1.5)

  if (!sprites) return

  const cx = width / 2 - sprites.w / 2
  const cy = height * 0.44 - sprites.h / 2
  const reach = sprites.w * 0.5

  // four petals: each lamp sways on its own rhythm, and the cursor walks
  // the whole rig, pushing every shadow away from the light
  for (const L of LIGHTS) {
    const a = L.angle + Math.sin(t * L.sway + L.phase) * 0.16
    const r = L.dist * (1 + 0.18 * Math.sin(t * L.sway * 1.4 + L.phase * 2.0)) * reach
    const dx = Math.cos(a) * r - mouseX * reach * 0.16
    const dy = Math.sin(a) * r - mouseY * reach * 0.16
    ctx.globalAlpha = L.alpha
    ctx.drawImage(sprites.shadow, cx + dx, cy + dy)
  }

  // the mark itself, lit from within
  ctx.globalAlpha = 0.5
  ctx.drawImage(sprites.bloom, cx, cy)
  ctx.globalAlpha = 1
  ctx.drawImage(sprites.logo, cx, cy)
}

requestAnimationFrame(draw)

window.__fable = { LIGHTS, get sprites() { return sprites } }
