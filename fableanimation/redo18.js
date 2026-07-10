// Vilnis II: the red text wave of 020, but the logotype is no longer an
// object — it is a hole in the prose. Every line flows up to the mark's
// silhouette, breaks, and continues on the far side; big counters keep
// their own little islands of text. The word-spacing wave and the variable
// width axis keep rolling through the sheet around it. Pure canvas 2d.

const LINES = 30
const TEXT =
  "HE OPENS THE FILE AND THE MARK IS ALREADY THERE WAITING. " +
  "A LINE PULLS UP AND PARKS HALF HIDDEN IN THE SHADE OF THE GRID. " +
  "REDO DRAWS IT AGAIN AND AGAIN UNTIL THE LINE FORGETS IT WAS EVER DRAWN. " +
  "THE CURVES IDLE. THE COUNTERS HUM. SOMEWHERE A CIRCLE WAITS FOR ITS BAR. " +
  "HE ZOOMS IN UNTIL THE EDGES GO SOFT AND THE WORD STOPS BEING A WORD. " +
  "THE BASELINE RUNS OFF INTO THE DARK LIKE A ROAD OUT OF TOWN. " +
  "EVERY VERSION IS FINAL. EVERY FINAL IS A DRAFT. "
const WORDS = TEXT.split(" ")

const LOGO_SHARE = 0.56 // of viewport width
const STRETCH = [
  "ultra-condensed", "extra-condensed", "condensed", "semi-condensed",
  "normal", "semi-expanded", "expanded", "extra-expanded"
]

const canvas = document.getElementById("sheet")
const ctx = canvas.getContext("2d")

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let cursorLine = -100
let energy = 0
let lastY = null

// -- logo mask ------------------------------------------------------------------------

const maskCanvas = document.createElement("canvas")
maskCanvas.width = 2048
maskCanvas.height = 560
let maskData = null
let maskFrac = { x: 1 }
let tintCanvas = null

fetch("redo-logo.svg")
  .then(r => r.text())
  .then(svg => {
    const sized = svg
      .replace(/currentColor/g, "#E3170D")
      .replace("<svg ", '<svg width="1840.49" height="468.42" ')
    const blob = new Blob([sized], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const g = maskCanvas.getContext("2d")
      const scale = Math.min((2048 * 0.96) / img.width, (560 * 0.92) / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      g.clearRect(0, 0, 2048, 560)
      g.drawImage(img, (2048 - dw) / 2, (560 - dh) / 2, dw, dh)
      maskFrac.x = dw / 2048
      maskData = g.getImageData(0, 0, 2048, 560).data
      tintCanvas = maskCanvas
      URL.revokeObjectURL(url)
      layout()
    }
    img.src = url
  })

// -- layout ---------------------------------------------------------------------------

const PADX = 22
const PADT = 18
const PADB = 40

let fs = 20
let lineYs = []
let lineGaps = [] // per line: array of [x0, x1] forbidden intervals
let logoRect = null

function layout() {
  canvas.width = width
  canvas.height = height

  fs = Math.max(11, Math.floor((height - PADT - PADB) / LINES / 1.16))
  const span = height - PADT - PADB
  lineYs = []
  for (let i = 0; i < LINES; i++) {
    lineYs.push(PADT + (span / LINES) * (i + 0.5))
  }

  lineGaps = lineYs.map(() => [])
  logoRect = null
  if (!maskData) return

  // the mark hangs centred; map every line's centre into the mask and
  // collect the covered runs it must flow around
  const artW = width * LOGO_SHARE
  const fullW = artW / maskFrac.x
  const fullH = fullW * 560 / 2048
  const cx = width / 2
  const cy = height * 0.5
  logoRect = { x: cx - fullW / 2, y: cy - fullH / 2, w: fullW, h: fullH }

  const pad = fs * 0.38
  const mergeGap = fs * 1.6

  lineGaps = lineYs.map(yc => {
    const v = (yc - cy) / fullH + 0.5
    if (v <= 0 || v >= 1) return []
    const row = Math.floor(v * 560)
    const runs = []
    let start = -1
    for (let mx = 0; mx < 2048; mx += 3) {
      const a = maskData[(row * 2048 + mx) * 4 + 3]
      if (a > 60 && start < 0) start = mx
      else if (a <= 60 && start >= 0) { runs.push([start, mx]); start = -1 }
    }
    if (start >= 0) runs.push([start, 2048])

    const px = runs.map(([a, b]) => [
      cx + (a / 2048 - 0.5) * fullW - pad,
      cx + (b / 2048 - 0.5) * fullW + pad
    ])
    // drop slots too small for a word — letters skip tiny holes,
    // but keep the big counters as islands
    const merged = []
    for (const seg of px) {
      const prev = merged[merged.length - 1]
      if (prev && seg[0] - prev[1] < mergeGap) prev[1] = seg[1]
      else merged.push(seg)
    }
    return merged
  })
}

window.addEventListener("resize", () => {
  width = window.innerWidth || width
  height = window.innerHeight || height
  layout()
})

window.addEventListener("mousemove", e => {
  cursorLine = (e.clientY / height) * LINES
  if (lastY !== null) {
    energy = Math.min(energy + Math.abs(e.clientY - lastY) / height * 4, 1.2)
  }
  lastY = e.clientY
})

// -- loop -----------------------------------------------------------------------------

let last = performance.now()
let t = 0
let fontsReady = false
document.fonts.load("500 20px 'YFF Rare VF'").then(() => { fontsReady = true; layout() })

function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  energy *= Math.pow(0.3, dt)
  t += dt * (1 + energy * 0.8)

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = "#F4F0EA"
  ctx.fillRect(0, 0, width, height)

  // the mark itself: the faintest blush, so the hole reads even where the
  // lines are airy
  if (tintCanvas && logoRect) {
    ctx.globalAlpha = 0.05
    ctx.drawImage(tintCanvas, logoRect.x, logoRect.y, logoRect.w, logoRect.h)
    ctx.globalAlpha = 1
  }

  if (!fontsReady) return

  for (let i = 0; i < LINES; i++) {
    const base = Math.pow(i / (LINES - 1), 1.25) * 0.88
    const wave = 0.34 * Math.sin(i * 0.42 - t * 1.15)
    const bulge = 0.45 * Math.exp(-Math.pow((i - cursorLine) / 3.2, 2))
    let w = base + wave + bulge
    w = Math.max(0, Math.min(1, w))

    const stretch = STRETCH[Math.round(w * (STRETCH.length - 1))]
    const weight = Math.round((380 + 320 * w) / 50) * 50
    ctx.font = `${weight} ${stretch} ${fs}px "YFF Rare VF"`
    ctx.letterSpacing = ((0.30 * (1 - w) - 0.01) * fs).toFixed(2) + "px"
    ctx.fillStyle = w > 0.82 ? "#c60f06" : "#E3170D"
    ctx.textBaseline = "middle"

    const gap = (2.3 - 2.24 * w) * fs * 0.36 + fs * 0.24
    const y = lineYs[i]
    const gaps = lineGaps[i] || []

    let x = PADX
    let k = (i * 13) % WORDS.length
    let guard = 0
    while (x < width - PADX && guard++ < 120) {
      const word = WORDS[k]
      k = (k + 1) % WORDS.length
      const ww = ctx.measureText(word).width
      // flow around the mark: if the word would cross a forbidden run,
      // jump to the far bank
      for (const [g0, g1] of gaps) {
        if (x < g1 && x + ww > g0) { x = g1; break }
      }
      if (x + ww > width - PADX) break
      ctx.fillText(word, x, y)
      x += ww + gap
    }
  }
}

requestAnimationFrame(frame)

window.__fable = {
  get t() { return t },
  layout,
  stage(phase) {
    t = phase
    frame(performance.now())
  }
}
