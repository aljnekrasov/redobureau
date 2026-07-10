import { WORKS, REDUCED, shuffled, loadAll, mountNav, onViewport } from "./moodworks.js"

// Žalūzijas 052: the board as a departures board. One work fills the screen,
// sliced into vertical louvres; every few seconds a wave sweeps across and
// each louvre flips on its axis — edge-on for an instant, then back — and
// swaps to the next work, so the whole picture turns over strip by strip.
// Click to flip now.

const stage = document.getElementById("stage")

const N = 15 // louvres
const SPAN = 4.5 // width of the flip wave, in louvres
const DUR = 1.7 // seconds for the wave to cross

let vw = 0
let vh = 0
let sw = 0
let slats = []
let order = []
let fromIdx = 0
let toIdx = 1
let sweeping = false
let prog = 0
let hold = 0

function coverBg(el, workPos, k) {
  const wk = WORKS[order[workPos]]
  const scale = Math.max(vw / wk.w, vh / wk.h)
  const cW = wk.w * scale
  const cH = wk.h * scale
  el.style.backgroundImage = `url(${wk.src})`
  el.style.backgroundSize = `${cW}px ${cH}px`
  el.style.backgroundPosition = `${((vw - cW) / 2 - k * sw).toFixed(1)}px ${((vh - cH) / 2).toFixed(1)}px`
}

function build() {
  vw = innerWidth
  vh = innerHeight
  sw = vw / N
  stage.innerHTML = ""
  slats = []
  for (let k = 0; k < N; k++) {
    const el = document.createElement("div")
    el.className = "slat"
    stage.appendChild(el)
    const s = { el, k, swapped: false }
    slats.push(s)
    coverBg(el, fromIdx, k)
  }
}

function startSweep() {
  if (sweeping) return
  sweeping = true
  prog = 0
  slats.forEach(s => (s.swapped = false))
}

stage.addEventListener("pointerdown", () => {
  hold = 0
  startSweep()
})

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  if (!sweeping) {
    if (!REDUCED) {
      hold += dt
      if (hold > 3.2) {
        hold = 0
        startSweep()
      }
    }
  } else {
    prog += dt * ((N + SPAN) / DUR)
    for (const s of slats) {
      const local = Math.max(0, Math.min(1, (prog - s.k) / SPAN))
      if (local >= 0.5 && !s.swapped) {
        coverBg(s.el, toIdx, s.k) // swap while edge-on
        s.swapped = true
      }
      const angle = local < 0.5 ? local * 180 : (local - 1) * 180
      s.el.style.transform = `rotateY(${angle.toFixed(1)}deg)`
      s.el.style.filter = `brightness(${(0.3 + 0.7 * Math.cos((angle * Math.PI) / 180)).toFixed(2)})`
    }
    if (prog >= N + SPAN) {
      sweeping = false
      fromIdx = toIdx
      toIdx = (toIdx + 1) % order.length
      slats.forEach(s => {
        s.el.style.transform = "rotateY(0deg)"
        s.el.style.filter = "brightness(1)"
      })
    }
  }

  requestAnimationFrame(frame)
}

let resizeT
addEventListener("resize", () => {
  clearTimeout(resizeT)
  resizeT = setTimeout(() => {
    if (innerWidth > 0 && innerHeight > 0) {
      sweeping = false
      build()
    }
  }, 200)
})

mountNav(23)
onViewport(async () => {
  order = shuffled(WORKS, 52).map(w => WORKS.indexOf(w))
  await loadAll(WORKS) // warm the cache so flips don't flash empty
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
