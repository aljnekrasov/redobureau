import { WORKS, REDUCED, shuffled, loadAll, mountNav, onViewport } from "./moodworks.js"

// Grāmata 065: the portfolio bound as a picture book. Each work fills a
// double-page spread; every few seconds the right page peels over the spine
// — its back already carrying the left half of the next work — and the book
// reads itself. Click to turn the page yourself.

const book = document.getElementById("book")
const left = document.getElementById("left")
const rightUnder = document.getElementById("rightUnder")
const flip = document.getElementById("flip")
const front = flip.querySelector(".front")
const back = flip.querySelector(".back")

const DUR = 1.15 // page turn, seconds

let order = []
let cur = 0
let pW = 0
let bH = 0
let turning = false
let hold = 0

// paint one half ('L' | 'R') of a work onto an element, cover-fit across
// the whole spread
function paintHalf(el, workPos, side) {
  const wk = WORKS[order[((workPos % order.length) + order.length) % order.length]]
  const spreadW = pW * 2
  const scale = Math.max(spreadW / wk.w, bH / wk.h)
  const cw = wk.w * scale
  const ch = wk.h * scale
  const ox = (spreadW - cw) / 2 - (side === "R" ? pW : 0)
  const oy = (bH - ch) / 2
  el.style.background = `#1c1a1e url(${wk.src}) no-repeat`
  el.style.backgroundSize = `${cw.toFixed(1)}px ${ch.toFixed(1)}px`
  el.style.backgroundPosition = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`
}

function paintAll() {
  paintHalf(left, cur, "L")
  paintHalf(front, cur, "R")
  paintHalf(back, cur + 1, "L")
  paintHalf(rightUnder, cur + 1, "R")
}

function layout() {
  bH = Math.min(innerHeight * 0.74, innerWidth * 0.52)
  pW = bH * 0.72
  book.style.width = pW * 2 + "px"
  book.style.height = bH + "px"
  for (const el of [left, rightUnder, flip, front, back]) {
    el.style.width = pW + "px"
    el.style.height = bH + "px"
  }
  paintAll()
}

function turn() {
  if (turning) return
  turning = true
  flip.style.transition = `transform ${DUR}s cubic-bezier(0.45, 0.05, 0.45, 1)`
  flip.style.transform = "rotateY(-180deg)"
  setTimeout(() => {
    cur += 1
    flip.style.transition = "none"
    flip.style.transform = "rotateY(0deg)"
    paintAll()
    turning = false
    hold = 0
  }, DUR * 1000 + 60)
}

addEventListener("pointerdown", () => turn())

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.1, (now - prev) / 1000)
  prev = now
  if (!REDUCED && !turning) {
    hold += dt
    if (hold > 3.2) turn()
  }
  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) layout()
  }, 200)
})

mountNav(36)
onViewport(async () => {
  order = shuffled(WORKS, 66).map(w => WORKS.indexOf(w))
  await loadAll(WORKS) // warm cache so page backs never flash empty
  layout()
  prev = performance.now()
  requestAnimationFrame(frame)
})
