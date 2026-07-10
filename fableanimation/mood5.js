import { WORKS, REDUCED, rng, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Rezgis 034: a strict quilt on paper — thirty tiles, three sizes, zero
// gaps beyond the 3px grout. Every few seconds the board breathes: tiles
// glide into each other's places, and every fourth beat the whole quilt
// is recut into a new arrangement, everything sliding at once (FLIP).
// Click anywhere to recut it yourself. Tall works live in tall tiles,
// the panorama gets the widest one.

const grid = document.getElementById("grid")

const BEAT = 3.6 // seconds between breaths

let cols = 8
let rows = 6
let seedTick = 0

// one cell per work, created once — layout only moves them around
const cells = shuffled(WORKS, 3).map(work => {
  const el = document.createElement("div")
  el.className = "cell"
  el.appendChild(workImage(work))
  grid.appendChild(el)
  return { el, ratio: work.ratio }
})

// --- the quilt cutter -----------------------------------------------------------
// 48 cells worth of spans — three 2x2, nine 2x1/1x2, eighteen 1x1 — laid
// greedily into the first free slot, retried with a new roll if a big
// span gets stranded. Deterministic per seed.
function pack(seed) {
  for (let att = 0; att < 90; att++) {
    const r = rng(seed + att * 131)
    const pool = []
    for (let i = 0; i < 3; i++) pool.push([2, 2])
    for (let i = 0; i < 9; i++) pool.push(r() < 0.5 ? [2, 1] : [1, 2])
    for (let i = 0; i < 18; i++) pool.push([1, 1])

    const occ = new Uint8Array(cols * rows)
    const out = []
    const fits = (c, row, w, h) => {
      if (c + w > cols || row + h > rows) return false
      for (let y = row; y < row + h; y++)
        for (let x = c; x < c + w; x++) if (occ[y * cols + x]) return false
      return true
    }

    let stranded = false
    for (let cell = 0; cell < cols * rows && out.length < cells.length; cell++) {
      if (occ[cell]) continue
      const c = cell % cols
      const row = (cell / cols) | 0
      const cand = []
      pool.forEach(([w, h], pi) => {
        if (fits(c, row, w, h)) cand.push(pi)
      })
      if (!cand.length) {
        stranded = true
        break
      }
      const bigs = cand.filter(pi => pool[pi][0] * pool[pi][1] > 1)
      const pick =
        bigs.length && r() < 0.66
          ? bigs[(r() * bigs.length) | 0]
          : cand[(r() * cand.length) | 0]
      const [w, h] = pool[pick]
      pool.splice(pick, 1)
      for (let y = row; y < row + h; y++)
        for (let x = c; x < c + w; x++) occ[y * cols + x] = 1
      out.push({ c, r: row, w, h })
    }
    if (!stranded && out.length === cells.length) return out
  }
  return null
}

// tall works into tall tiles, wide into wide: rank both by ratio and zip
function applyLayout(tiles) {
  const tileOrder = tiles
    .map((t, i) => i)
    .sort((a, b) => tiles[a].w / tiles[a].h - tiles[b].w / tiles[b].h)
  const cellOrder = cells
    .map((c, i) => i)
    .sort((a, b) => cells[a].ratio - cells[b].ratio)
  tileOrder.forEach((ti, rank) => {
    const t = tiles[ti]
    const el = cells[cellOrder[rank]].el
    el.style.gridColumn = `${t.c + 1} / span ${t.w}`
    el.style.gridRow = `${t.r + 1} / span ${t.h}`
  })
}

// --- FLIP ------------------------------------------------------------------------

function flip(mutate) {
  const before = cells.map(({ el }) => el.getBoundingClientRect())
  mutate()
  cells.forEach(({ el }, i) => {
    const a = before[i]
    const b = el.getBoundingClientRect()
    const dx = a.left - b.left
    const dy = a.top - b.top
    const sx = a.width / b.width
    const sy = a.height / b.height
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return
    el.style.zIndex = 10
    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
        { transform: "none" },
      ],
      {
        duration: 820,
        delay: (Math.abs(dx) + Math.abs(dy)) * 0.14,
        easing: "cubic-bezier(0.65, 0.05, 0.36, 1)",
        fill: "backwards",
      }
    )
    anim.finished.then(() => (el.style.zIndex = ""), () => {})
  })
}

function measure() {
  const aspect = innerWidth / innerHeight
  ;[cols, rows] = aspect < 0.62 ? [4, 12] : aspect < 1 ? [6, 8] : [8, 6]
  grid.style.setProperty("--c", cols)
  grid.style.setProperty("--r", rows)
}

function recut(animated) {
  seedTick++
  const tiles = pack(1000 + seedTick * 7)
  if (!tiles) return
  if (animated) flip(() => applyLayout(tiles))
  else applyLayout(tiles)
}

// swap a few pairs of same-span tiles — a quiet breath between recuts
function breathe() {
  const groups = new Map()
  cells.forEach(({ el }) => {
    const key = el.style.gridColumn.split("span ")[1] + "x" + el.style.gridRow.split("span ")[1]
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(el)
  })
  const r = rng(500 + seedTick * 13)
  seedTick++
  flip(() => {
    for (const [, els] of groups) {
      if (els.length < 2) continue
      const pairs = Math.min(2, els.length >> 1)
      const order = els.slice().sort(() => r() - 0.5)
      for (let p = 0; p < pairs; p++) {
        const a = order[p * 2]
        const b = order[p * 2 + 1]
        const colA = a.style.gridColumn
        const rowA = a.style.gridRow
        a.style.gridColumn = b.style.gridColumn
        a.style.gridRow = b.style.gridRow
        b.style.gridColumn = colA
        b.style.gridRow = rowA
      }
    }
  })
}

// --- heartbeat --------------------------------------------------------------------

let beatT = 0
let beatN = 0
let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.1, (now - prev) / 1000)
  prev = now
  if (!REDUCED) {
    beatT += dt
    if (beatT > BEAT) {
      beatT = 0
      beatN++
      if (beatN % 4 === 0) recut(true)
      else breathe()
    }
  }
  requestAnimationFrame(frame)
}

grid.addEventListener("click", () => {
  beatT = 0
  recut(true)
})

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth === 0 || innerHeight === 0) return
    measure()
    recut(false)
  }, 220)
})

mountNav(5)
onViewport(() => {
  measure()
  recut(false)

  // first paint: a wave of tiles fading up from the corner
  if (!REDUCED) {
    cells.forEach(({ el }) => {
      const rect = el.getBoundingClientRect()
      el.animate(
        [
          { opacity: 0, transform: "scale(0.94)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        {
          duration: 600,
          delay: (rect.left + rect.top) * 0.32,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "backwards",
        }
      )
    })
  }

  prev = performance.now()
  requestAnimationFrame(frame)
})
