import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Domino 073: the works stood on end in two rows. A topple runs down the
// line — each card keels onto its neighbour, rests a moment in the pile,
// then the wave releases them and they stand back up, over and over. The
// two rows run in opposite directions. Click to send the wave back the
// other way.

let rows = [] // { cards: [{el}], n }
let dir = 1
let t = 0

const FALL = 62 // resting angle, deg

function build() {
  document.querySelectorAll(".row").forEach(r => r.remove())
  rows = []
  const vw = innerWidth
  const vh = innerHeight
  const works = shuffled(WORKS, 74)
  const perRow = 15
  const cw = vw / (perRow + 2.5)
  const chh = Math.min(cw * 1.5, vh * 0.3)

  ;[0.86, 0.42].forEach((yFrac, ri) => {
    const row = document.createElement("div")
    row.className = "row"
    row.style.top = (yFrac * vh - chh).toFixed(1) + "px"
    row.style.height = chh + "px"
    const cards = []
    for (let i = 0; i < perRow; i++) {
      const el = document.createElement("div")
      el.className = "dom"
      el.style.width = cw + "px"
      el.style.height = chh + "px"
      el.style.left = ((i + 1) * (vw / (perRow + 1.6))).toFixed(1) + "px"
      el.style.zIndex = perRow - i
      const img = workImage(works[(ri * perRow + i) % works.length])
      img.classList.remove("work")
      img.addEventListener("load", () => img.classList.add("on"), { once: true })
      if (img.complete && img.naturalWidth) img.classList.add("on")
      el.appendChild(img)
      row.appendChild(el)
      cards.push({ el })
    }
    document.body.appendChild(row)
    rows.push({ cards, n: perRow, flip: ri === 1 })
  })
}

addEventListener("pointerdown", () => (dir = -dir))

const ease = u => u * u * (3 - 2 * u)

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  if (!REDUCED) t += dt * 6.5

  for (const row of rows) {
    const span = row.n + 10
    let p = (dir > 0 ? t : -t) % span
    if (p < 0) p += span
    for (let i = 0; i < row.n; i++) {
      const idx = row.flip ? row.n - 1 - i : i
      let u = p - i
      if (u < 0) u += span
      let a = 0
      if (u < 1) a = ease(u) * FALL
      else if (u < 6) a = FALL
      else if (u < 7.4) a = FALL * (1 - ease((u - 6) / 1.4))
      const card = row.cards[idx]
      const sign = row.flip ? -1 : 1
      card.el.style.transform = `rotate(${(sign * a).toFixed(2)}deg)`
      card.el.style.filter = `brightness(${(1 - (a / FALL) * 0.3).toFixed(3)})`
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

mountNav(44)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
