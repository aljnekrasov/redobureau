import { WORKS, REDUCED, rng, shuffled, loadAll, mountNav, onViewport } from "./moodworks.js"

// Vitrāža 069: the portfolio leaded into a stained-glass window. The screen
// is shattered into triangular panes; neighbouring panes belong to the same
// work, so each project reads as one irregular shard of glass held in dark
// lead lines. Every pane breathes — its glass drifts a hair behind the
// others — and the pane under the cursor lights up as if the sun found it.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

const GC = 8 // grid cols of points (triangles: (GC-1)*(GR-1)*2)
const GR = 6

let vw = 0
let vh = 0
let imgs = []
let tris = [] // { path, widx, bbox, phase }
let mx = -1e4
let my = -1e4
let t = 0

function build() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  tris = []
  const r = rng(70)
  const order = shuffled(WORKS, 70)

  // jittered lattice, edges pinned
  const px = []
  const py = []
  for (let j = 0; j < GR; j++) {
    for (let i = 0; i < GC; i++) {
      const bx = (i / (GC - 1)) * vw
      const by = (j / (GR - 1)) * vh
      const jx = i === 0 || i === GC - 1 ? 0 : (r() - 0.5) * (vw / GC) * 0.7
      const jy = j === 0 || j === GR - 1 ? 0 : (r() - 0.5) * (vh / GR) * 0.7
      px.push(bx + jx)
      py.push(by + jy)
    }
  }
  const at = (i, j) => j * GC + i

  for (let j = 0; j < GR - 1; j++) {
    for (let i = 0; i < GC - 1; i++) {
      // each lattice cell maps to one work zone (6×5 = 30)
      const wz = Math.min(5, Math.floor((i / (GC - 1)) * 6))
      const hz = Math.min(4, Math.floor((j / (GR - 1)) * 5))
      const widx = WORKS.indexOf(order[hz * 6 + wz])
      const corners = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]
      const split = r() < 0.5
      const pair = split
        ? [[0, 1, 2], [0, 2, 3]]
        : [[0, 1, 3], [1, 2, 3]]
      for (const idx of pair) {
        const path = new Path2D()
        const xs = idx.map(k => px[corners[k]])
        const ys = idx.map(k => py[corners[k]])
        path.moveTo(xs[0], ys[0])
        path.lineTo(xs[1], ys[1])
        path.lineTo(xs[2], ys[2])
        path.closePath()
        const bx0 = Math.min(...xs)
        const by0 = Math.min(...ys)
        tris.push({
          path,
          widx,
          bbox: [bx0, by0, Math.max(...xs) - bx0, Math.max(...ys) - by0],
          phase: r() * Math.PI * 2,
        })
      }
    }
  }
}

addEventListener("pointermove", e => {
  mx = e.clientX
  my = e.clientY
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += REDUCED ? 0 : dt

  ctx.fillStyle = "#0a0a0c"
  ctx.fillRect(0, 0, vw, vh)

  for (const tri of tris) {
    const img = imgs[tri.widx]
    if (!img || !img.naturalWidth) continue
    const lit = ctx.isPointInPath(tri.path, mx, my)
    ctx.save()
    ctx.clip(tri.path)
    // glass drifts a touch inside its lead came
    const ox = Math.sin(t * 0.7 + tri.phase) * 4
    const oy = Math.cos(t * 0.55 + tri.phase) * 3
    // cover the pane's own zone generously so the drift never shows edges
    const [bx, by, bw, bh] = tri.bbox
    const pad = 30
    const dw = bw + pad * 2
    const dh = bh + pad * 2
    const s = Math.max(dw / img.naturalWidth, dh / img.naturalHeight)
    const cw = img.naturalWidth * s
    const ch = img.naturalHeight * s
    ctx.drawImage(img, bx - pad + (dw - cw) / 2 + ox, by - pad + (dh - ch) / 2 + oy, cw, ch)
    if (lit) {
      ctx.fillStyle = "rgba(255, 250, 230, 0.14)"
      ctx.fill(tri.path)
    }
    ctx.restore()
  }

  // lead lines on top
  ctx.strokeStyle = "rgba(8, 8, 10, 0.9)"
  ctx.lineWidth = 4
  for (const tri of tris) ctx.stroke(tri.path)
  ctx.strokeStyle = "rgba(190, 200, 210, 0.08)"
  ctx.lineWidth = 1.4
  for (const tri of tris) ctx.stroke(tri.path)

  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) build()
  }, 200)
})

mountNav(40)
onViewport(async () => {
  imgs = await loadAll(WORKS)
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
