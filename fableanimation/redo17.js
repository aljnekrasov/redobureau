// Vilnis: a text sheet after the reference poster — a running block of red
// prose where the space between words collapses line by line while the
// letters themselves widen on the variable axis, top airy, bottom a dense
// red mass. A slow wave travels through the block, so the compression
// front rolls down the page forever. The cursor bulges the wave locally.
// Set in YFF Rare VF (wdth 50..150, wght 100..900).

const LINES = 30
const TEXT =
  "HE OPENS THE FILE AND THE MARK IS ALREADY THERE WAITING. " +
  "A LINE PULLS UP AND PARKS HALF HIDDEN IN THE SHADE OF THE GRID. " +
  "REDO DRAWS IT AGAIN AND AGAIN UNTIL THE LINE FORGETS IT WAS EVER DRAWN. " +
  "THE CURVES IDLE. THE COUNTERS HUM. SOMEWHERE A CIRCLE WAITS FOR ITS BAR. " +
  "HE ZOOMS IN UNTIL THE EDGES GO SOFT AND THE WORD STOPS BEING A WORD. " +
  "THE BASELINE RUNS OFF INTO THE DARK LIKE A ROAD OUT OF TOWN. " +
  "EVERY VERSION IS FINAL. EVERY FINAL IS A DRAFT. "

const block = document.getElementById("block")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let cursorLine = -100
let energy = 0
let lastY = null

const lines = []

// every line carries plenty of words — the right edge clips mid-letter,
// like the poster's full-bleed setting
const WORDS = TEXT.split(" ")
function lineText(i) {
  const out = []
  let k = (i * 13) % WORDS.length
  for (let n = 0; n < 46; n++) {
    out.push(WORDS[k])
    k = (k + 1) % WORDS.length
  }
  return out.join(" ")
}

function build() {
  block.innerHTML = ""
  lines.length = 0
  const fs = Math.max(11, Math.floor((height - 70) / LINES / 1.16))
  for (let i = 0; i < LINES; i++) {
    const el = document.createElement("div")
    el.className = "ln"
    el.textContent = lineText(i)
    el.style.fontSize = fs + "px"
    el.style.lineHeight = "1.0"
    block.appendChild(el)
    lines.push(el)
  }
}

build()

window.addEventListener("resize", () => {
  width = window.innerWidth || width
  height = window.innerHeight || height
  build()
})

window.addEventListener("mousemove", e => {
  cursorLine = (e.clientY / height) * LINES
  if (lastY !== null) {
    energy = Math.min(energy + Math.abs(e.clientY - lastY) / height * 4, 1.2)
  }
  lastY = e.clientY
})

let last = performance.now()
let t = 0

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  energy *= Math.pow(0.3, dt)
  t += dt * (1 + energy * 0.8)

  for (let i = 0; i < LINES; i++) {
    // base gradient like the poster: airy at the top, crushed at the bottom,
    // with a travelling wave rolling through and a bulge under the cursor
    const base = Math.pow(i / (LINES - 1), 1.25) * 0.88
    const wave = 0.34 * Math.sin(i * 0.42 - t * 1.15)
    const bulge = 0.45 * Math.exp(-Math.pow((i - cursorLine) / 3.2, 2))
    let w = base + wave + bulge
    w = Math.max(0, Math.min(1, w))

    // spacing collapses while the letters swell on the width axis
    const wordSp = (2.3 - 2.24 * w).toFixed(3)
    const letterSp = (0.30 * (1 - w) - 0.01).toFixed(3)
    const wdth = (50 + 100 * w).toFixed(1)
    const wght = (380 + 320 * w).toFixed(0)

    const el = lines[i]
    el.style.wordSpacing = wordSp + "em"
    el.style.letterSpacing = letterSp + "em"
    el.style.fontVariationSettings = `'wdth' ${wdth}, 'wght' ${wght}`
    // the dense mass reads a touch deeper red, like ink pooling
    el.style.color = w > 0.82 ? "#c60f06" : "#E3170D"
  }
}

requestAnimationFrame(frame)

window.__fable = { lines, get time() { return t } }
