// Magneti: the mark as a hidden magnet under paper. Six thousand iron
// filings lie scattered on the dark sheet; a magnetisation cycle swells and
// the filings snap into alignment along the field's contour lines — the
// silhouette emerges as a halo of combed steel around an invisible core.
// The field lets go and they relax into lazy drift. The cursor is a bar
// magnet tip: filings comb into rings around it.

const canvas = document.getElementById("scene_root")
const ctx = canvas.getContext("2d")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = -1e4, mouseY = -1e4
let energy = 0
let lastX = null, lastY = null

// -- field from the logo mask ----------------------------------------------------------

const FW = 256, FH = 70
let field = null                      // Float32Array, blurred coverage 0..1
const rect = { x: 0, y: 0, w: 1000, h: 274 }   // logo region on screen

fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#fff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => {
    const mc = document.createElement("canvas"); mc.width = 1024; mc.height = 280
    const mg = mc.getContext("2d")
    const s = Math.min((1024 * 0.94) / img.width, (280 * 0.86) / img.height)
    const dw = img.width * s, dh = img.height * s
    mg.drawImage(img, (1024 - dw) / 2, (280 - dh) / 2, dw, dh)

    const bc = document.createElement("canvas"); bc.width = 1024; bc.height = 280
    const bg = bc.getContext("2d")
    bg.filter = "blur(16px)"
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

function fAt(u, v) {
  if (!field || u < 0 || u > 1 || v < 0 || v > 1) return 0
  const x = u * (FW - 1), y = v * (FH - 1)
  const x0 = x | 0, y0 = y | 0
  const x1 = Math.min(x0 + 1, FW - 1), y1 = Math.min(y0 + 1, FH - 1)
  const fx = x - x0, fy = y - y0
  const a = field[y0 * FW + x0], b = field[y0 * FW + x1]
  const c = field[y1 * FW + x0], d = field[y1 * FW + x1]
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy
}

// -- filings ---------------------------------------------------------------------------

const N = 6200
const fil = new Float32Array(N * 4)   // x, y, angle, coverage-cache

function seed() {
  let i = 0
  // most filings sprinkle around the field itself
  while (i < N * 0.6) {
    const u = Math.random(), v = Math.random()
    if (fAt(u, v) > 0.02 || Math.random() < 0.04) {
      fil[i * 4]     = rect.x + u * rect.w + (Math.random() - 0.5) * 6
      fil[i * 4 + 1] = rect.y + v * rect.h + (Math.random() - 0.5) * 6
      fil[i * 4 + 2] = Math.random() * Math.PI * 2
      i++
    }
  }
  // the rest dust the whole sheet
  for (; i < N; i++) {
    fil[i * 4]     = Math.random() * width
    fil[i * 4 + 1] = Math.random() * height
    fil[i * 4 + 2] = Math.random() * Math.PI * 2
  }
}

// slow ambient drift angle for unmagnetised filings
function driftA(x, y, t) {
  return Math.sin(x * 0.006 + Math.sin(y * 0.009 + t * 0.13) * 1.6) * 2.2
       + Math.sin(y * 0.005 - t * 0.08) * 1.7
}

// -- sizing / input --------------------------------------------------------------------

function applySize() {
  width = window.innerWidth || width
  height = window.innerHeight || height
  canvas.width = width; canvas.height = height
  rect.w = width * 0.78
  rect.h = rect.w * (280 / 1024)
  rect.x = (width - rect.w) / 2
  rect.y = (height - rect.h) / 2
}
applySize()
window.addEventListener("resize", () => { applySize(); if (field) seed() })

window.addEventListener("mousemove", e => {
  mouseX = e.clientX; mouseY = e.clientY
  if (lastX !== null) energy = Math.min(energy + Math.hypot(e.clientX - lastX, e.clientY - lastY) / Math.max(width, height) * 4, 1.2)
  lastX = e.clientX; lastY = e.clientY
})

// -- loop ------------------------------------------------------------------------------

let t = 0
let last = performance.now()

// 6 brightness buckets, each a batched path
const BUCKETS = 6
const bx0 = [], by0 = [], bx1 = [], by1 = []
for (let b = 0; b < BUCKETS; b++) { bx0.push([]); by0.push([]); bx1.push([]); by1.push([]) }

function render(dt) {
  t += dt
  energy *= Math.pow(0.45, dt)

  // magnetisation swells and releases on a slow cycle; stirring feeds it
  const mag = Math.min(1.2, Math.pow(0.5 - 0.5 * Math.cos(t * 0.5), 1.4) * 1.1 + energy * 0.6)

  ctx.fillStyle = "#0a0b0e"
  ctx.fillRect(0, 0, width, height)

  if (!field) return
  for (let b = 0; b < BUCKETS; b++) { bx0[b].length = 0; by0[b].length = 0; bx1[b].length = 0; by1[b].length = 0 }

  const e = 1 / FW
  const px = 2 * e * rect.w          // uv step in screen px, for true gradients

  for (let i = 0; i < N; i++) {
    const ix = i * 4
    const x = fil[ix], y = fil[ix + 1]
    const u = (x - rect.x) / rect.w
    const v = (y - rect.y) / rect.h

    const cov = fAt(u, v)
    const dfdx = (fAt(u + e, v) - fAt(u - e, v)) / px
    // vertical gradient with its own uv step
    const ev = 1 / FH
    const py = 2 * ev * rect.h
    const dfdyv = (fAt(u, v + ev) - fAt(u, v - ev)) / py

    const g = Math.hypot(dfdx, dfdyv)

    // cursor: comb into rings around the magnet tip
    const dx = x - mouseX, dy = y - mouseY
    const dc = Math.hypot(dx, dy)

    let target, align
    if (dc < 150) {
      target = Math.atan2(dy, dx) + Math.PI / 2
      align = 1 - dc / 150
    } else if (g > 0.0006) {
      // tangent to the field's contour lines
      target = Math.atan2(dfdx, -dfdyv)
      align = Math.min(1, g * 260) * mag
    } else {
      target = driftA(x, y, t)
      align = 0
    }
    if (align < 0.03) { target = driftA(x, y, t); align = 0 }

    // shortest-arc relax toward the target
    let a = fil[ix + 2]
    let da = target - a
    da -= Math.round(da / (Math.PI * 2)) * Math.PI * 2
    a += da * Math.min(1, dt * (1.6 + 9 * Math.max(align, 0.06)))
    fil[ix + 2] = a
    fil[ix + 3] = cov

    const bright = Math.min(1, 0.14 + cov * 0.55 + align * 0.5)
    const len = 3.2 + 2.2 * cov + 1.6 * align
    const ca = Math.cos(a) * len, sa = Math.sin(a) * len
    const b = Math.min(BUCKETS - 1, (bright * BUCKETS) | 0)
    bx0[b].push(x - ca); by0[b].push(y - sa)
    bx1[b].push(x + ca); by1[b].push(y + sa)
  }

  ctx.lineWidth = 1.1
  ctx.lineCap = "round"
  for (let b = 0; b < BUCKETS; b++) {
    const n = bx0[b].length
    if (!n) continue
    const alpha = 0.10 + (b / (BUCKETS - 1)) * 0.62
    ctx.strokeStyle = `rgba(198,206,222,${alpha.toFixed(3)})`
    ctx.beginPath()
    for (let k = 0; k < n; k++) {
      ctx.moveTo(bx0[b][k], by0[b][k])
      ctx.lineTo(bx1[b][k], by1[b][k])
    }
    ctx.stroke()
  }
}

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  render(dt)
}
requestAnimationFrame(frame)

window.__fable = { get t() { return t }, set t(v) { t = v }, step(dt) { render(dt) } }
