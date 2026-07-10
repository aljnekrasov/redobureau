// Hologramma: the mark projected from a floor emitter. A cyan volumetric
// cone rises from a bright lens on the ground and the logotype hangs in it,
// sliced into horizontal scan bands that wobble out of register, RGB
// channels splitting at the edges, dust motes drifting up through the beam.
// Every few seconds the signal drops — a band of the image tears sideways
// and heals. The cursor tilts the projection in parallax.

const canvas = document.getElementById("scene_root")
const ctx = canvas.getContext("2d")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0, mouseY = 0

// -- tinted logo plates ----------------------------------------------------------------

const LW = 1400, LH = 356
let plateC = null, plateR = null, plateB = null

function tint(img, color) {
  const c = document.createElement("canvas"); c.width = LW; c.height = LH
  const g = c.getContext("2d")
  const s = Math.min((LW * 0.96) / img.width, (LH * 0.96) / img.height)
  const dw = img.width * s, dh = img.height * s
  g.drawImage(img, (LW - dw) / 2, (LH - dh) / 2, dw, dh)
  g.globalCompositeOperation = "source-in"
  g.fillStyle = color
  g.fillRect(0, 0, LW, LH)
  return c
}

fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#fff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => {
    plateC = tint(img, "#63e7ff")
    plateR = tint(img, "#ff4d6a")
    plateB = tint(img, "#3f6bff")
    URL.revokeObjectURL(url)
  }
  img.src = url
})

// -- dust in the beam ------------------------------------------------------------------

const MOTES = 70
const motes = []
for (let i = 0; i < MOTES; i++) {
  motes.push({ u: Math.random(), v: Math.random(), s: 0.4 + Math.random() * 0.8, p: Math.random() * 6.28 })
}

// -- sizing / input --------------------------------------------------------------------

function applySize() {
  width = window.innerWidth || width
  height = window.innerHeight || height
  canvas.width = width; canvas.height = height
}
applySize()
window.addEventListener("resize", applySize)
window.addEventListener("mousemove", e => {
  mouseX = (e.clientX / width - 0.5) * 2
  mouseY = (e.clientY / height - 0.5) * 2
})

// -- loop ------------------------------------------------------------------------------

let t = 0
let last = performance.now()

function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x) }

function step(dt) {
  t += dt

  ctx.globalCompositeOperation = "source-over"
  ctx.fillStyle = "#04060c"
  ctx.fillRect(0, 0, width, height)

  // layout: emitter on the floor, hologram floating above it
  const ex = width / 2, ey = height * 0.88
  const hw = Math.min(width * 0.62, height * 1.15)     // hologram width
  const hh = hw * (LH / LW)
  const hx = (width - hw) / 2
  const hy = height * 0.42 - hh / 2 + Math.sin(t * 0.9) * 8   // gentle bob

  // signal state
  const flick = 0.72 + 0.22 * Math.sin(t * 47.0) * (0.4 + 0.6 * hash(Math.floor(t * 13)))
  const tearCycle = t % 4.7
  const tearing = tearCycle < 0.42
  const tearY = hash(Math.floor(t / 4.7)) * 0.8 + 0.1     // band position, fraction of hh
  const tilt = mouseX * 0.10

  ctx.globalCompositeOperation = "lighter"

  // the cone of light from the emitter to the image
  const cone = ctx.createLinearGradient(0, ey, 0, hy)
  cone.addColorStop(0, "rgba(90,220,255,0.30)")
  cone.addColorStop(1, "rgba(90,220,255,0.02)")
  ctx.fillStyle = cone
  ctx.beginPath()
  ctx.moveTo(ex - 26, ey)
  ctx.lineTo(hx - 14, hy + hh * 1.06)
  ctx.lineTo(hx + hw + 14, hy + hh * 1.06)
  ctx.lineTo(ex + 26, ey)
  ctx.closePath()
  ctx.fill()

  // emitter lens
  const lens = ctx.createRadialGradient(ex, ey, 0, ex, ey, 90)
  lens.addColorStop(0, "rgba(200,250,255,0.9)")
  lens.addColorStop(0.18, "rgba(110,230,255,0.45)")
  lens.addColorStop(1, "rgba(110,230,255,0)")
  ctx.fillStyle = lens
  ctx.beginPath(); ctx.ellipse(ex, ey, 90, 22, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "rgba(235,255,255,0.95)"
  ctx.beginPath(); ctx.ellipse(ex, ey, 10, 3.2, 0, 0, Math.PI * 2); ctx.fill()

  // dust motes rising in the beam
  for (const m of motes) {
    m.v -= dt * 0.05 * m.s
    if (m.v < 0) { m.v = 1; m.u = Math.random() }
    const my = ey - (ey - hy) * (1 - m.v)
    const spread = 30 + (hw / 2 - 16) * (1 - m.v)
    const mx = ex + (m.u - 0.5) * 2 * spread + Math.sin(t * 1.3 + m.p) * 6
    ctx.fillStyle = `rgba(160,240,255,${(0.10 + 0.25 * m.s * (0.5 + 0.5 * Math.sin(t * 2 + m.p))).toFixed(3)})`
    ctx.fillRect(mx, my, 1.6, 1.6)
  }

  // the sliced hologram
  if (plateC) {
    const BAND = 6                       // source rows per band
    const bands = Math.ceil(LH / BAND)
    const scaleY = hh / LH
    for (let b = 0; b < bands; b++) {
      const sy = b * BAND
      const dy = hy + sy * scaleY
      const yf = sy / LH
      let dx = Math.sin(yf * 21.0 + t * 3.1) * 2.2
      dx += (yf - 0.5) * hh * tilt
      if (tearing && yf > tearY && yf < tearY + 0.16) {
        dx += (hash(b * 7.7 + Math.floor(t * 30)) - 0.3) * 46
      }
      const a = flick * (0.75 + 0.25 * hash(b * 3.3 + Math.floor(t * 21)))
      const split = 2.4 + (tearing ? 6 : 0) + Math.abs(tilt) * 26

      ctx.globalAlpha = a * 0.3
      ctx.drawImage(plateR, 0, sy, LW, BAND, hx + dx - split, dy, hw, BAND * scaleY)
      ctx.drawImage(plateB, 0, sy, LW, BAND, hx + dx + split, dy, hw, BAND * scaleY)
      ctx.globalAlpha = a * 0.85
      ctx.drawImage(plateC, 0, sy, LW, BAND, hx + dx, dy, hw, BAND * scaleY)
    }
    ctx.globalAlpha = 1

    // soft double-exposure ghost
    ctx.globalAlpha = 0.10 * flick
    ctx.drawImage(plateC, hx + Math.sin(t * 1.7) * 5, hy - 4, hw, hh)
    ctx.globalAlpha = 1

    // faint reflection under the emitter
    ctx.globalAlpha = 0.05
    ctx.save()
    ctx.translate(0, ey * 2 + 30)
    ctx.scale(1, -1)
    ctx.drawImage(plateC, hx, ey - hh * 0.5, hw, hh * 0.5)
    ctx.restore()
    ctx.globalAlpha = 1
  }
}

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  step(dt)
}
requestAnimationFrame(frame)

window.__fable = { get t(){ return t }, set t(v){ t = v }, step }
