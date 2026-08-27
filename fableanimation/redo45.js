// Oparts: a Vasarely homage. The mark is tiled edge to edge on deep
// ultramarine, and every cell's brightness is set by its distance from a
// slowly wandering focal point — quantized into hard poster tiers, so the
// glow reads as stepped op-art rings, white-hot at the core. Breathing
// rings of brightness pulse outward through the tiers, and flip-waves roll
// across the grid turning cells upside down as they pass. The focal point
// leans toward the cursor; a click fires a flip-burst from it.

const canvas = document.getElementById("scene_root")
const ctx = canvas.getContext("2d")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0.5, mouseY = 0.5

const BG = "#232e86"
const TIERS = 7

// -- the mark, pre-rendered white ---------------------------------------------------------------

let logoImg = null
const LOGO_AR = 1840.49 / 468.42
fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#ffffff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => {
    const c = document.createElement("canvas")
    c.width = 720; c.height = Math.round(720 / LOGO_AR)
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height)
    logoImg = c
    buildGrid()
    URL.revokeObjectURL(url)
  }
  img.src = url
})

// -- grid ----------------------------------------------------------------------------------------

let cells = []
let CW = 200, CH = 60, COLS = 5, ROWS = 9

function buildGrid() {
  COLS = width > 900 ? 5 : 3
  CW = width / COLS
  CH = (CW / LOGO_AR) * 1.35        // rows breathe, no touching
  ROWS = Math.ceil(height / CH) + 1
  cells = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const f0 = Math.random() < 0.3 ? Math.PI : 0
      cells.push({
        c, r,
        x: c * CW + CW / 2,
        y: r * CH + CH / 2,
        flip: f0,
        target: f0,
        last: -10
      })
    }
  }
}

// -- sizing / input ------------------------------------------------------------------------------

function applySize() {
  width = window.innerWidth || width
  height = window.innerHeight || height
  canvas.width = width; canvas.height = height
  if (logoImg) buildGrid()
}
applySize()
window.addEventListener("resize", applySize)
window.addEventListener("mousemove", e => {
  mouseX = e.clientX / width
  mouseY = e.clientY / height
})

let burst = -10
let burstX = 0.5, burstY = 0.5
window.addEventListener("mousedown", () => { burst = t; burstX = mouseX; burstY = mouseY })

// -- loop ----------------------------------------------------------------------------------------

let t = 0
let fx = 0.5, fy = 0.5
let last = performance.now()

function step(dt) {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()
  t += dt
  if (!logoImg || !cells.length) {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, width, height)
    return
  }

  // the focal point wanders, leaning toward the cursor
  const wx = 0.5 + 0.16 * Math.sin(t * 0.16) + (mouseX - 0.5) * 0.35
  const wy = 0.5 + 0.14 * Math.sin(t * 0.21 + 1.7) + (mouseY - 0.5) * 0.35
  fx += (wx - fx) * Math.min(1, dt * 1.5)
  fy += (wy - fy) * Math.min(1, dt * 1.5)

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, width, height)

  const maxD = Math.hypot(Math.max(fx, 1 - fx) * width, Math.max(fy, 1 - fy) * height)

  for (const cell of cells) {
    const dx = cell.x - fx * width
    const dy = cell.y - fy * height
    const d = Math.min(1, Math.hypot(dx, dy) / (maxD * 0.62))  // tighter falloff

    // stepped poster tiers + a breathing ring rolling outward
    let v = 1 - d
    v += 0.12 * Math.sin(d * 9.0 - t * 1.3) * d   // rings breathe, core stays lit
    let tier = Math.round(v * (TIERS - 1))
    tier = Math.max(0, Math.min(TIERS - 1, tier))
    const alpha = 0.14 + Math.pow(tier / (TIERS - 1), 2.4) * 0.86

    // flip-waves: a slow diagonal sweep + click bursts
    const sweep = ((t * 0.09) % 1.6) * (width + height) - height * 0.3
    if (Math.abs(cell.x + cell.y - sweep) < CW * 0.4 && t - cell.last > 2.5) {
      cell.target += Math.PI
      cell.last = t
    }
    if (burst > 0) {
      const bd = Math.hypot(cell.x - burstX * width, cell.y - burstY * height)
      const age = t - burst
      if (age > 0 && Math.abs(bd - age * 900) < CW * 0.5 && t - cell.last > 0.8) {
        cell.target += Math.PI
        cell.last = t
      }
    }
    cell.flip += (cell.target - cell.flip) * Math.min(1, dt * 6)

    // the crop is the point: the further from the core, the less of the
    // mark survives — outer cells keep only a central fragment
    const keep = 0.24 + 0.76 * Math.pow(tier / (TIERS - 1), 0.85)
    const dwF = CW * 0.90
    const dhF = dwF / LOGO_AR
    const sw = logoImg.width * keep
    const sx = (logoImg.width - sw) / 2
    const dw = dwF * keep
    const squish = Math.abs(Math.cos(cell.flip))   // fold through the flip

    ctx.save()
    ctx.translate(cell.x, cell.y)
    ctx.scale(1, Math.max(0.02, squish) * (Math.cos(cell.flip) < 0 ? -1 : 1))
    ctx.globalAlpha = alpha
    ctx.drawImage(logoImg, sx, 0, sw, logoImg.height, -dw / 2, -dhF / 2, dw, dhF)
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  step(dt)
}
requestAnimationFrame(frame)

window.__fable = {
  get t() { return t }, set t(v) { t = v },
  set focus(p) { fx = p[0]; fy = p[1] },
  step
}
