import { WORKS, REDUCED, rng, shuffled, loadAll, coverDraw, mountNav, onViewport } from "./moodworks.js"

// Drumstalas 044 — experimental. Every work is ground into a few thousand
// grains of coloured dust. The swarm gathers into one project — grains
// densest where the picture is brightest — holds for a breath, then blows
// apart and reassembles as the next. Drag your cursor through it and the
// grains scatter out of the way. The whole portfolio, one particle system.

const canvas = document.getElementById("c")
const ctx = canvas.getContext("2d")

const N = 8000 // enough grains to read as a picture, not a starfield
const buf = document.createElement("canvas")
const bx = buf.getContext("2d")

let vw = 0
let vh = 0
let imgs = []
let order = []
let cur = 0
let hold = 0

// particle arrays
const px = new Float32Array(N)
const py = new Float32Array(N)
const vx = new Float32Array(N)
const vy = new Float32Array(N)
const tx = new Float32Array(N)
const ty = new Float32Array(N)
const col = new Array(N)

const cache = new Map() // workIndex -> {tx,ty,col}
let mx = -1e4
let my = -1e4
let idle = 0
let t = 0

function resize() {
  vw = innerWidth
  vh = innerHeight
  canvas.width = vw
  canvas.height = vh
  const bw = 150
  buf.width = bw
  buf.height = Math.max(2, Math.round((bw * vh) / vw))
  cache.clear() // targets are viewport-relative
  ctx.fillStyle = "#08080a"
  ctx.fillRect(0, 0, vw, vh)
}

// derive N target grains for a work, denser in the bright regions
function targetsFor(workIndex) {
  const cached = cache.get(workIndex)
  if (cached) return cached
  const img = imgs[workIndex]
  const bw = buf.width
  const bh = buf.height
  bx.fillStyle = "#000"
  bx.fillRect(0, 0, bw, bh)
  if (img && img.naturalWidth) coverDraw(bx, img, 0, 0, bw, bh)
  const data = bx.getImageData(0, 0, bw, bh).data

  const cells = bw * bh
  const cum = new Float32Array(cells)
  let acc = 0
  let meanL = 0
  let m2L = 0
  for (let i = 0; i < cells; i++) {
    const o = i * 4
    const lum = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) / 255
    meanL += lum
    m2L += lum * lum
    // steep weighting so grains cluster into the bright forms and the dark
    // ground stays sparse — the picture emerges instead of a flat haze
    acc += Math.pow(lum, 2.2) + 0.006
    cum[i] = acc
  }
  const total = acc
  meanL /= cells
  const contrast = m2L / cells - meanL * meanL // tonal variance, for opener pick
  const r = rng(workIndex * 2657 + 11)
  const T = { tx: new Float32Array(N), ty: new Float32Array(N), col: new Array(N), contrast }
  for (let k = 0; k < N; k++) {
    // binary search the cumulative weight
    let lo = 0
    let hi = cells - 1
    const target = r() * total
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cum[mid] < target) lo = mid + 1
      else hi = mid
    }
    const cxi = lo % bw
    const cyi = (lo / bw) | 0
    T.tx[k] = ((cxi + r()) / bw) * vw
    T.ty[k] = ((cyi + r()) / bh) * vh
    const o = lo * 4
    T.col[k] = `rgb(${data[o]},${data[o + 1]},${data[o + 2]})`
  }
  cache.set(workIndex, T)
  return T
}

function retarget(workIndex) {
  const T = targetsFor(workIndex)
  tx.set(T.tx)
  ty.set(T.ty)
  for (let k = 0; k < N; k++) col[k] = T.col[k]
}

addEventListener("pointermove", e => {
  mx = e.clientX
  my = e.clientY
  idle = 0
})
addEventListener("pointerdown", () => {
  hold = 99
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.04, (now - prev) / 1000)
  prev = now
  t += dt
  idle += dt

  if (!REDUCED) {
    hold += dt
    if (hold > 3.0) {
      hold = 0
      cur = (cur + 1) % order.length
      retarget(order[cur])
    }
  }

  if (idle > 3 && !REDUCED) {
    mx = vw * (0.5 + 0.4 * Math.sin(t * 0.5))
    my = vh * (0.5 + 0.36 * Math.cos(t * 0.4))
  }

  // fade the previous frame → motion trails
  ctx.fillStyle = "rgba(8,8,10,0.30)"
  ctx.fillRect(0, 0, vw, vh)

  const K = 30 // spring toward target
  const DAMP = Math.pow(0.0025, dt)
  const R = 130
  const R2 = R * R
  for (let i = 0; i < N; i++) {
    let ax = (tx[i] - px[i]) * K
    let ay = (ty[i] - py[i]) * K
    // cursor shoves grains aside
    const dx = px[i] - mx
    const dy = py[i] - my
    const d2 = dx * dx + dy * dy
    if (d2 < R2) {
      const d = Math.sqrt(d2) || 1
      const f = (1 - d / R) * 4200
      ax += (dx / d) * f
      ay += (dy / d) * f
    }
    vx[i] = (vx[i] + ax * dt) * DAMP
    vy[i] = (vy[i] + ay * dt) * DAMP
    px[i] += vx[i] * dt
    py[i] += vy[i] * dt
    ctx.fillStyle = col[i]
    ctx.fillRect(px[i], py[i], 2.2, 2.2)
  }

  requestAnimationFrame(frame)
}

addEventListener("resize", () => {
  if (innerWidth > 0 && innerHeight > 0) resize()
})

mountNav(15)
onViewport(async () => {
  resize()
  imgs = await loadAll(WORKS)
  order = shuffled(WORKS, 31).map(w => WORKS.indexOf(w))
  // build every work's grain map up front (so later switches never hitch),
  // and open on the highest-contrast one so the dust reads as a picture at
  // once instead of a flat haze
  let best = 0
  let bestScore = -1
  order.forEach((wi, k) => {
    const c = targetsFor(wi).contrast
    if (c > bestScore) {
      bestScore = c
      best = k
    }
  })
  cur = best
  retarget(order[cur])
  // spawn the grains already near their marks so the first picture is there,
  // then let every later work explode and reassemble
  for (let i = 0; i < N; i++) {
    px[i] = tx[i] + (Math.random() - 0.5) * 44
    py[i] = ty[i] + (Math.random() - 0.5) * 44
  }
  prev = performance.now()
  requestAnimationFrame(frame)
})
