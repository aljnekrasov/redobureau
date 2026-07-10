import { SVGLoader } from "three/addons/loaders/SVGLoader.js"

// Osciloskops: the mark as a vector-scope trace. A single electron beam
// races along the true outlines of the letterforms — pulled straight from
// the SVG paths — and the green phosphor remembers where it has been, so
// the whole logotype hangs on the tube as a decaying afterglow behind the
// bright travelling spot. The cursor is a stray magnet held to the glass:
// the beam bends around it, and the warp burns into the trace.

const canvas = document.getElementById("scene_root")
const ctx = canvas.getContext("2d")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = -1e4, mouseY = -1e4

// -- outlines from the SVG paths -------------------------------------------------------

let rawLoops = null    // arrays of {x, y} in SVG space
let loops = []         // resampled to uniform arc length, screen space
let cum = []           // cumulative start distance of each loop
let L = 0              // total trace length
const STEP = 2.4       // px between points

fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const data = new SVGLoader().parse(svg)
  rawLoops = []
  for (const p of data.paths) {
    for (const sp of p.subPaths) {
      const pts = sp.getPoints(60)
      if (pts.length > 4) rawLoops.push(pts)
    }
  }
  applyLayout()
})

function applyLayout() {
  if (!rawLoops) return
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9
  for (const lp of rawLoops) for (const p of lp) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y
  }
  const s = Math.min((width * 0.74) / (maxX - minX), (height * 0.5) / (maxY - minY))
  const ox = (width - (maxX - minX) * s) / 2 - minX * s
  const oy = (height - (maxY - minY) * s) / 2 - minY * s

  loops = []; cum = []; L = 0
  for (const lp of rawLoops) {
    // scale, then resample to uniform STEP spacing (closed)
    const scaled = lp.map(p => ({ x: p.x * s + ox, y: p.y * s + oy }))
    scaled.push({ ...scaled[0] })
    const out = []
    let carry = 0
    for (let i = 1; i < scaled.length; i++) {
      const a = scaled[i - 1], b = scaled[i]
      const seg = Math.hypot(b.x - a.x, b.y - a.y)
      if (seg < 1e-6) continue
      let d = carry
      while (d < seg) {
        const f = d / seg
        out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f })
        d += STEP
      }
      carry = d - seg
    }
    if (out.length > 3) {
      cum.push(L)
      loops.push(out)
      L += out.length * STEP
    }
  }
}

// -- beam deflection near the cursor ---------------------------------------------------

function deflect(p) {
  const dx = p.x - mouseX, dy = p.y - mouseY
  const r = Math.hypot(dx, dy) + 40
  const push = Math.min(3400 / r, 30)
  return { x: p.x + (dx / r) * push, y: p.y + (dy / r) * push }
}

// -- drawing ---------------------------------------------------------------------------

function drawSpan(d0, d1) {
  // draw the beam's path between trace distances d0..d1 (no wrap inside)
  for (let li = 0; li < loops.length; li++) {
    const start = cum[li]
    const len = loops[li].length * STEP
    const a = Math.max(d0, start)
    const b = Math.min(d1, start + len)
    if (b <= a) continue
    const pts = loops[li]
    const i0 = Math.floor((a - start) / STEP)
    const i1 = Math.min(Math.ceil((b - start) / STEP), pts.length - 1)
    if (i1 <= i0) continue
    ctx.beginPath()
    let p = deflect(pts[i0])
    ctx.moveTo(p.x, p.y)
    for (let i = i0 + 1; i <= i1; i++) {
      p = deflect(pts[i])
      ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
}

function headPoint(d) {
  for (let li = 0; li < loops.length; li++) {
    const start = cum[li]
    const len = loops[li].length * STEP
    if (d >= start && d < start + len) {
      return deflect(loops[li][Math.floor((d - start) / STEP)])
    }
  }
  return null
}

// -- sizing / input --------------------------------------------------------------------

function applySize() {
  width = window.innerWidth || width
  height = window.innerHeight || height
  canvas.width = width; canvas.height = height
  applyLayout()
}
applySize()
window.addEventListener("resize", applySize)
window.addEventListener("mousemove", e => { mouseX = e.clientX; mouseY = e.clientY })

// -- loop ------------------------------------------------------------------------------

let t = 0
let head = 0
let last = performance.now()

function step(dt) {
  t += dt
  if (!L) return

  // phosphor decay: erode the trace's alpha
  ctx.globalCompositeOperation = "destination-out"
  ctx.fillStyle = `rgba(0,0,0,${Math.min(0.12, dt * 0.55).toFixed(4)})`
  ctx.fillRect(0, 0, width, height)

  // advance the beam — the full mark takes ~5 s
  const speed = L / 5
  const d0 = head
  head = (head + speed * dt) % L

  ctx.globalCompositeOperation = "lighter"
  ctx.lineWidth = 1.6
  ctx.lineJoin = "round"
  ctx.strokeStyle = "rgba(112,255,170,0.85)"
  ctx.shadowColor = "rgba(60,255,150,0.9)"
  ctx.shadowBlur = 10

  if (head >= d0) drawSpan(d0, head)
  else { drawSpan(d0, L); drawSpan(0, head) }

  // the bright spot itself
  const hp = headPoint(head)
  if (hp) {
    ctx.shadowBlur = 18
    ctx.fillStyle = "rgba(220,255,235,0.95)"
    ctx.beginPath()
    ctx.arc(hp.x, hp.y, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.shadowBlur = 0
}

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  step(dt)
}
requestAnimationFrame(frame)

window.__fable = { get t() { return t }, set t(v) { t = v }, step, get L() { return L } }
