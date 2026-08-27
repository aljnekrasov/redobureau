// Otas: the mark painted in by hand. Nine hundred small brushes live inside
// the letterforms; each one crawls along the silhouette's contour field and
// lays down a short stroke, taking its color from the Nano Banana marble at
// that spot — so the word slowly fills with directional painterly strokes,
// like a canvas being worked. The paint keeps dissolving at a whisper, so
// the mark is forever half-finished, always being repainted. The cursor
// scatters the brushes.

const canvas = document.getElementById("scene_root")
const ctx = canvas.getContext("2d")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = -1e4, mouseY = -1e4

// -- mask + direction field -------------------------------------------------------------------

const FW = 256, FH = 70
let field = null
let maskData = null
const MW = 1024, MH = 280
const rect = { x: 0, y: 0, w: 1000, h: 274 }

fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#fff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => {
    const mc = document.createElement("canvas"); mc.width = MW; mc.height = MH
    const mg = mc.getContext("2d")
    const s = Math.min((MW * 0.94) / img.width, (MH * 0.86) / img.height)
    const dw = img.width * s, dh = img.height * s
    mg.drawImage(img, (MW - dw) / 2, (MH - dh) / 2, dw, dh)
    maskData = mg.getImageData(0, 0, MW, MH).data

    const bc = document.createElement("canvas"); bc.width = MW; bc.height = MH
    const bg = bc.getContext("2d")
    bg.filter = "blur(14px)"
    bg.drawImage(mc, 0, 0)
    const sc = document.createElement("canvas"); sc.width = FW; sc.height = FH
    const sg = sc.getContext("2d")
    sg.drawImage(bc, 0, 0, FW, FH)
    const data = sg.getImageData(0, 0, FW, FH).data
    field = new Float32Array(FW * FH)
    for (let i = 0; i < FW * FH; i++) field[i] = data[i * 4 + 3] / 255

    URL.revokeObjectURL(url)
    seed()
  }
  img.src = url
})

// -- palette from the Nano Banana marble ---------------------------------------------------------

let palData = null
const palImg = new Image()
palImg.onload = () => {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256
  const g = c.getContext("2d")
  g.drawImage(palImg, 0, 0, 256, 256)
  palData = g.getImageData(0, 0, 256, 256).data
}
palImg.src = "nano-texture.png"

function colorAt(u, v, boost) {
  if (!palData) return "rgba(200,120,80,0.4)"
  const x = Math.max(0, Math.min(255, (u * 256) | 0))
  const y = Math.max(0, Math.min(255, (v * 256) | 0))
  const i = (y * 256 + x) * 4
  const r = Math.min(255, palData[i] * boost | 0)
  const g = Math.min(255, palData[i + 1] * boost | 0)
  const b = Math.min(255, palData[i + 2] * boost | 0)
  return `rgba(${r},${g},${b},0.5)`
}

// -- field helpers --------------------------------------------------------------------------------

function fAt(u, v) {
  if (!field || u < 0 || u > 1 || v < 0 || v > 1) return 0
  const x = Math.min(FW - 1.001, u * (FW - 1)), y = Math.min(FH - 1.001, v * (FH - 1))
  const x0 = x | 0, y0 = y | 0
  const fx = x - x0, fy = y - y0
  const a = field[y0 * FW + x0], b = field[y0 * FW + x0 + 1]
  const c = field[(y0 + 1) * FW + x0], d = field[(y0 + 1) * FW + x0 + 1]
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy
}
function maskAt(u, v) {
  if (u < 0 || u >= 1 || v < 0 || v >= 1 || !maskData) return 0
  return maskData[(((v * MH) | 0) * MW + ((u * MW) | 0)) * 4 + 3]
}

// -- brushes ---------------------------------------------------------------------------------------

const N = 900
const brushes = []

function spawn(b) {
  for (let k = 0; k < 40; k++) {
    const u = Math.random(), v = Math.random()
    if (maskAt(u, v) > 120) {
      b.x = rect.x + u * rect.w
      b.y = rect.y + v * rect.h
      b.a = Math.random() * Math.PI * 2
      b.life = 1.5 + Math.random() * 2.5
      b.wgt = 1 + Math.random() * 2.4
      b.boost = 0.85 + Math.random() * 0.65
      return
    }
  }
  b.life = 0
}

function seed() {
  brushes.length = 0
  for (let i = 0; i < N; i++) { const b = {}; spawn(b); brushes.push(b) }
  painted = false
}

// -- sizing / input -----------------------------------------------------------------------------------

function applySize() {
  width = window.innerWidth || width
  height = window.innerHeight || height
  canvas.width = width; canvas.height = height
  rect.w = width * 0.8
  rect.h = rect.w * (MH / MW)
  rect.x = (width - rect.w) / 2
  rect.y = (height - rect.h) / 2
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, width, height)
  if (field) seed()
}
applySize()
window.addEventListener("resize", applySize)
window.addEventListener("mousemove", e => { mouseX = e.clientX; mouseY = e.clientY })

// -- loop ----------------------------------------------------------------------------------------------

let t = 0
let painted = false
let last = performance.now()

function step(dt) {
  t += dt
  if (!field) return

  // the whisper of dissolution — old paint sinks into the black
  ctx.fillStyle = "rgba(0,0,0,0.016)"
  ctx.fillRect(0, 0, width, height)

  ctx.lineCap = "round"
  const e = 1 / FW, ev = 1 / FH

  for (const b of brushes) {
    b.life -= dt
    if (b.life <= 0) { spawn(b); continue }

    const u = (b.x - rect.x) / rect.w
    const v = (b.y - rect.y) / rect.h
    if (maskAt(u, v) < 60) { spawn(b); continue }

    // steer along the contour field, drift inside
    const gx = (fAt(u + e, v) - fAt(u - e, v)) / (2 * e * rect.w)
    const gy = (fAt(u, v + ev) - fAt(u, v - ev)) / (2 * ev * rect.h)
    const g = Math.hypot(gx, gy)
    let target
    if (g > 0.0008) target = Math.atan2(gx, -gy)
    else target = b.a + Math.sin(t * 0.7 + b.x * 0.02) * 0.4
    let da = target - b.a
    da -= Math.round(da / (Math.PI * 2)) * Math.PI * 2
    b.a += da * Math.min(1, dt * 5)

    // cursor scatters
    const dx = b.x - mouseX, dy = b.y - mouseY
    const d2 = dx * dx + dy * dy
    if (d2 < 14400) b.a = Math.atan2(dy, dx)

    const sp = 46 * dt * (1 + 0.4 * Math.sin(t + b.wgt))
    const nx = b.x + Math.cos(b.a) * sp
    const ny = b.y + Math.sin(b.a) * sp

    ctx.strokeStyle = colorAt(u, v, b.boost)
    ctx.lineWidth = b.wgt
    ctx.beginPath()
    ctx.moveTo(b.x, b.y)
    ctx.lineTo(nx, ny)
    ctx.stroke()

    b.x = nx; b.y = ny
  }
}

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  step(dt)
}
requestAnimationFrame(frame)

window.__fable = { get t() { return t }, set t(v) { t = v }, step }
