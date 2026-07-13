import { WORKS, REDUCED, shuffled, workImage, mountNav, onViewport } from "./moodworks.js"

// Šūnas 056: the works set into a honeycomb — hexagonal cells packed edge to
// edge, filling the frame. The comb drifts on a slow current; brush a cell
// and it swells out of the wall, nudging the ring of neighbours around it.

const stage = document.getElementById("stage")

let cells = []
let vw = 0
let vh = 0
let t = 0

function build() {
  vw = innerWidth
  vh = innerHeight
  stage.innerHTML = ""
  cells = []
  const vmin = Math.min(vw, vh)
  const hexW = vmin * 0.2
  const hexH = (hexW * 2) / Math.sqrt(3)
  const colStep = hexW
  const rowStep = hexH * 0.75
  const cols = Math.ceil(vw / colStep) + 2
  const rows = Math.ceil(vh / rowStep) + 2
  const works = shuffled(WORKS, 56)
  let idx = 0
  // centre the comb
  const ox = (vw - (cols - 1) * colStep) / 2
  const oy = (vh - (rows - 1) * rowStep) / 2

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * colStep + (r % 2 ? colStep / 2 : 0)
      const y = oy + r * rowStep
      const el = document.createElement("div")
      el.className = "cell"
      el.style.width = hexW + "px"
      el.style.height = hexH + "px"
      el.style.left = (x - hexW / 2).toFixed(1) + "px"
      el.style.top = (y - hexH / 2).toFixed(1) + "px"
      const img = workImage(works[idx++ % works.length])
      img.classList.remove("work")
      img.addEventListener("load", () => img.classList.add("on"), { once: true })
      if (img.complete && img.naturalWidth) img.classList.add("on")
      el.appendChild(img)
      stage.appendChild(el)
      const cell = { el, hover: 0, hoverT: 0 }
      el.addEventListener("pointerenter", () => (cell.hoverT = 1))
      el.addEventListener("pointerleave", () => (cell.hoverT = 0))
      cells.push(cell)
    }
  }
}

let prev = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now
  t += REDUCED ? 0 : dt

  // whole comb drifts on a slow current
  const dx = Math.sin(t * 0.18) * 14
  const dy = Math.cos(t * 0.14) * 12
  stage.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`

  for (const c of cells) {
    c.hover += (c.hoverT - c.hover) * Math.min(1, dt * 9)
    c.el.style.zIndex = c.hoverT ? 200 : 1
    const s = 1 + c.hover * 0.55
    c.el.style.transform = `scale(${s.toFixed(3)})`
    c.el.style.filter = `brightness(${(0.8 + c.hover * 0.3).toFixed(2)})`
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

mountNav(27)
onViewport(() => {
  build()
  prev = performance.now()
  requestAnimationFrame(frame)
})
