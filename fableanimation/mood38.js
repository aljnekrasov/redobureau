import { WORKS, REDUCED, rng, shuffled, loadAll, mountNav, onViewport } from "./moodworks.js"

// Puzle 067: a work as a sliding fifteen-puzzle. The board scrambles itself
// tile by tile, pauses, then solves by replaying its own moves backwards —
// the work clicks back together, holds for a breath, and the next one takes
// its place. Click to skip to the next work.

const board = document.getElementById("board")

const COLS = 4
const ROWS = 3

let order = []
let cur = 0
let bw = 0
let bh = 0
let tw = 0
let th = 0
let tiles = [] // { el, pos } — pos = cell index, tile home = array index
let hole = COLS * ROWS - 1
let history = []
let phase = "scramble" // scramble | pause | solve | done
let stepT = 0
let stepsLeft = 0
let lastMoved = -1
const r = rng(68)

function paintTiles() {
  const wk = WORKS[order[cur % order.length]]
  const scale = Math.max(bw / wk.w, bh / wk.h)
  const cw = wk.w * scale
  const ch = wk.h * scale
  const ox = (bw - cw) / 2
  const oy = (bh - ch) / 2
  tiles.forEach((t, home) => {
    const hc = home % COLS
    const hr = Math.floor(home / COLS)
    t.el.style.backgroundImage = `url(${wk.src})`
    t.el.style.backgroundSize = `${cw.toFixed(1)}px ${ch.toFixed(1)}px`
    t.el.style.backgroundPosition = `${(ox - hc * tw).toFixed(1)}px ${(oy - hr * th).toFixed(1)}px`
  })
}

function place(t, animate = true) {
  if (!animate) t.el.style.transition = "none"
  const c = t.pos % COLS
  const row = Math.floor(t.pos / COLS)
  t.el.style.transform = `translate(${(c * tw).toFixed(1)}px, ${(row * th).toFixed(1)}px)`
  if (!animate) {
    t.el.offsetHeight
    t.el.style.transition = ""
  }
}

function build() {
  bw = Math.min(innerWidth * 0.78, innerHeight * 0.78 * (3 / 2))
  bh = bw * (2 / 3)
  tw = bw / COLS
  th = bh / ROWS
  board.style.width = bw + "px"
  board.style.height = bh + "px"
  board.innerHTML = ""
  tiles = []
  hole = COLS * ROWS - 1
  history = []
  phase = "scramble"
  stepsLeft = 24
  lastMoved = -1
  for (let i = 0; i < COLS * ROWS - 1; i++) {
    const el = document.createElement("div")
    el.className = "tile"
    el.style.width = tw + "px"
    el.style.height = th + "px"
    board.appendChild(el)
    const t = { el, pos: i }
    tiles.push(t)
    place(t, false)
  }
  paintTiles()
}

// slide the tile at cell `p` into the hole
function slide(tileIdx) {
  const t = tiles[tileIdx]
  const from = t.pos
  t.pos = hole
  hole = from
  place(t)
}

function randomMove() {
  const hc = hole % COLS
  const hr = Math.floor(hole / COLS)
  const cand = []
  tiles.forEach((t, i) => {
    const c = t.pos % COLS
    const row = Math.floor(t.pos / COLS)
    if (Math.abs(c - hc) + Math.abs(row - hr) === 1 && i !== lastMoved) cand.push(i)
  })
  const pick = cand[Math.floor(r() * cand.length)]
  lastMoved = pick
  history.push(pick)
  slide(pick)
}

addEventListener("pointerdown", () => {
  // skip ahead: next work, fresh scramble
  cur += 1
  build()
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.1, (now - prev) / 1000)
  prev = now

  if (!REDUCED) {
    stepT += dt
    if (phase === "scramble" && stepT > 0.26) {
      stepT = 0
      randomMove()
      if (--stepsLeft <= 0) {
        phase = "pause"
        stepT = -0.7
      }
    } else if (phase === "pause" && stepT > 0) {
      phase = "solve"
      stepT = 0
    } else if (phase === "solve" && stepT > 0.19) {
      stepT = 0
      if (history.length) slide(history.pop())
      else {
        phase = "done"
        stepT = -1.9
      }
    } else if (phase === "done" && stepT > 0) {
      cur += 1
      paintTiles()
      phase = "scramble"
      stepsLeft = 24
      stepT = -0.5
    }
  }

  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) build()
  }, 200)
})

mountNav(38)
onViewport(async () => {
  order = shuffled(WORKS, 68).map(w => WORKS.indexOf(w))
  await loadAll(WORKS)
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
