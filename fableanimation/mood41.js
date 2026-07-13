import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Svārsts 070: thirty works hung on strings, each pendulum a shade slower
// than its neighbour. They start swinging as one, drift apart into ripples
// and helixes, and every long while snap back into line — the classic
// pendulum wave, drawn with a portfolio. Click to gather them and let the
// pattern start over.

const AMP = 13 // degrees
const T0 = 6.4 // base period, s
const K = 22 // period spread: T_i = T0 * K / (K + i)

let pends = []
let t0 = 0

function build() {
  document.querySelectorAll(".pend").forEach(p => p.remove())
  pends = []
  const works = shuffled(WORKS, 71)
  const n = works.length
  const vw = innerWidth
  const vh = innerHeight
  const cw = Math.min(vw / (n + 4), vh * 0.09)
  const ch = cw * 1.35

  works.forEach((work, i) => {
    const pend = document.createElement("div")
    pend.className = "pend"
    const x = ((i + 0.5) / n) * vw
    pend.style.left = (x - cw / 2).toFixed(1) + "px"
    pend.style.width = cw + "px"

    const string = document.createElement("div")
    string.className = "string"
    // strings lengthen across the row so the cards hang on a gentle arc
    const L = vh * (0.30 + 0.34 * Math.sin((i / (n - 1)) * Math.PI))
    string.style.height = L.toFixed(1) + "px"

    const card = document.createElement("div")
    card.className = "card"
    card.style.width = cw + "px"
    card.style.height = ch + "px"
    const img = workImage(work)
    img.classList.remove("work")
    img.addEventListener("load", () => img.classList.add("on"), { once: true })
    if (img.complete && img.naturalWidth) img.classList.add("on")
    card.appendChild(img)

    pend.appendChild(string)
    pend.appendChild(card)
    document.body.appendChild(pend)
    pends.push({ el: pend, period: (T0 * K) / (K + i) })
  })
}

addEventListener("pointerdown", () => (t0 = performance.now()))

function frame(now) {
  const t = (now - t0) / 1000
  for (const p of pends) {
    const a = REDUCED ? Math.sin((p.period * 7) % 1) * 2 : AMP * Math.sin((Math.PI * 2 * t) / p.period)
    p.el.style.transform = `rotate(${a.toFixed(2)}deg)`
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

mountNav(41)
onViewport(() => {
  build()
  t0 = performance.now()
  requestAnimationFrame(frame)
})
