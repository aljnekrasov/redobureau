// Terminalis: the mark rendered as green-phosphor ASCII on a CRT. The logo
// is sampled to a character grid; a scanline sweeps down and "prints" the
// art row by row with a typing flicker, glyph density mapping coverage.
// Once drawn it lives: characters shimmer between similar densities, a
// wandering "cursor" corrupts a patch into garbage that heals, and the
// cursor position rasterises brighter. Boot log framing, phosphor bloom.

const screen = document.getElementById("screen")
const RAMP = " .:-=+*#%@"           // low -> high coverage
const NOISE = "!<>/\\|()[]{}?$&01#*+"

let cols = 0, rows = 0
let cw = 8.5, ch = 15
let cover = null   // Float32Array coverage per cell
let grid = null    // current chars
let printed = 0    // how many rows have been revealed

let mouseCol = -10, mouseRow = -10

// measure the monospace cell
function measure(fs) {
  const probe = document.createElement("span")
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font:" + fs + "px/1 monospace"
  probe.textContent = "MMMMMMMMMM"
  document.body.appendChild(probe)
  const w = probe.getBoundingClientRect().width / 10
  document.body.removeChild(probe)
  return w
}

// -- sample the logo ------------------------------------------------------------------

let coverImg = null
fetch("redo-logo.svg").then(r => r.text()).then(svg => {
  const sized = svg.replace(/currentColor/g, "#fff")
    .replace("<svg ", '<svg width="1840.49" height="468.42" ')
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
  const img = new Image()
  img.onload = () => { coverImg = img; URL.revokeObjectURL(url); layout() }
  img.src = url
})

function layout() {
  const fs = Math.max(9, Math.round(window.innerHeight / 46))
  screen.style.fontSize = fs + "px"
  cw = measure(fs); ch = fs
  cols = Math.floor(window.innerWidth / cw)
  rows = Math.floor(window.innerHeight / ch)
  if (!coverImg) return

  // draw logo into an offscreen sized to the char grid, aspect-corrected
  const oc = document.createElement("canvas")
  oc.width = cols; oc.height = rows
  const g = oc.getContext("2d")
  g.fillStyle = "#000"; g.fillRect(0, 0, cols, rows)
  const logoAspect = 1840.49 / 468.42
  let dw = cols * 0.82
  let dh = dw / logoAspect / (cw / ch)   // correct for non-square cells
  if (dh > rows * 0.5) { dh = rows * 0.5; dw = dh * logoAspect * (cw / ch) }
  g.drawImage(coverImg, (cols - dw) / 2, (rows - dh) / 2, dw, dh)
  const data = g.getImageData(0, 0, cols, rows).data

  cover = new Float32Array(cols * rows)
  grid = new Array(cols * rows).fill(" ")
  for (let i = 0; i < cols * rows; i++) cover[i] = data[i * 4] / 255
  printed = 0
}

window.addEventListener("resize", layout)
window.addEventListener("mousemove", e => {
  mouseCol = Math.floor(e.clientX / cw)
  mouseRow = Math.floor(e.clientY / ch)
})

// -- boot header ----------------------------------------------------------------------

const HEADER = [
  "REDO CRT TERMINAL  v0.29  —  phosphor mode",
  "loading vector /assets/redo-logo.svg ... ok",
  "rasterising to character grid ...",
  ""
]

// -- loop -----------------------------------------------------------------------------

let t = 0, last = performance.now(), acc = 0
function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05); last = now
  t += dt; acc += dt

  if (!cover) return
  // reveal ~34 rows per second, then loop the print after a hold
  const cycle = (t % 9)
  if (cycle < 5.0) printed = Math.min(rows, Math.floor(cycle * rows / 3.0))
  else printed = rows
  if (cycle < dt * 2) printed = 0 // restart sweep each loop

  // repaint on a ~30fps tick for the flicker
  if (acc < 0.033) return
  acc = 0

  const out = []
  const hStart = 1
  for (let r = 0; r < rows; r++) {
    let line = ""
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      // header text overlaid at top-left
      if (r >= hStart && r < hStart + HEADER.length && c < HEADER[r - hStart].length && cover[idx] < 0.15) {
        line += HEADER[r - hStart][c]
        continue
      }
      if (r > printed) { line += " "; continue }
      const cov = cover[idx]
      if (cov < 0.04) { line += " "; continue }

      // near the reveal edge or under the cursor: garble
      const nearEdge = (printed - r) < 2
      const nearCursor = Math.abs(c - mouseCol) + Math.abs(r - mouseRow) < 4
      let cell
      if ((nearEdge && Math.random() < 0.5) || (nearCursor && Math.random() < 0.4)) {
        cell = NOISE[(Math.random() * NOISE.length) | 0]
      } else {
        // coverage -> glyph, with a shimmer that nudges density
        const shim = (Math.sin(t * 6 + c * 0.7 + r * 1.3) * 0.06)
        let lv = Math.min(0.999, Math.max(0, cov + shim))
        cell = RAMP[Math.floor(lv * (RAMP.length - 1)) + 1] || RAMP[RAMP.length - 1]
      }
      line += cell
    }
    out.push(line)
  }
  // blinking block cursor at the print head
  screen.textContent = out.join("\n")
}
requestAnimationFrame(frame)

window.__fable = { get t(){ return t }, set t(v){ t = v }, get printed(){ return printed }, layout }
