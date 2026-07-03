// procedural sky canvases shared by the fable animations

// standalone fallback: waves in the 11.jpg palette
export function makeFallbackSky() {
  const size = 1024
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#04041e"
  ctx.fillRect(0, 0, size, size)

  const bands = [
    { color: "#d40000", y: 0.10, amp: 90, freq: 1.5, w: 70 },
    { color: "#1414e0", y: 0.34, amp: 120, freq: 1.0, w: 160 },
    { color: "#ff3fd2", y: 0.62, amp: 100, freq: 1.8, w: 60 },
    { color: "#ffe93b", y: 0.72, amp: 110, freq: 1.8, w: 40 },
    { color: "#63ffe9", y: 0.86, amp: 90, freq: 2.2, w: 46 },
    { color: "#1414e0", y: 0.95, amp: 80, freq: 1.2, w: 120 }
  ]

  ctx.globalCompositeOperation = "lighter"
  for (const band of bands) {
    ctx.strokeStyle = band.color
    ctx.lineWidth = band.w
    ctx.shadowColor = band.color
    ctx.shadowBlur = 70
    ctx.beginPath()
    for (let x = -40; x <= size + 40; x += 8) {
      const y =
        band.y * size +
        Math.sin((x / size) * Math.PI * 2 * band.freq) * band.amp
      x === -40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  return canvas
}

// grainy teal velvet: soft diagonal light streaks buried in per-pixel noise
export function makeVelvetSky() {
  const size = 1024
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#0d5570"
  ctx.fillRect(0, 0, size, size)

  // large soft tonal patches
  const patches = [
    { x: 0.25, y: 0.45, r: 0.55, color: "rgba(6, 38, 56, 0.65)" },
    { x: 0.85, y: 0.25, r: 0.5, color: "rgba(7, 33, 50, 0.6)" },
    { x: 0.65, y: 0.85, r: 0.55, color: "rgba(8, 48, 68, 0.5)" },
    { x: 0.5, y: 0.15, r: 0.45, color: "rgba(24, 112, 138, 0.35)" }
  ]
  for (const p of patches) {
    const g = ctx.createRadialGradient(
      p.x * size, p.y * size, 0,
      p.x * size, p.y * size, p.r * size
    )
    g.addColorStop(0, p.color)
    g.addColorStop(1, "rgba(0, 0, 0, 0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }

  // soft diagonal light streaks
  const streaks = [
    { x: 0.42, y: 0.08, len: 0.42, angle: 0.55, w: 34, alpha: 0.34 },
    { x: -0.05, y: 0.52, len: 0.38, angle: 0.75, w: 28, alpha: 0.28 },
    { x: -0.02, y: 0.78, len: 0.42, angle: 0.85, w: 24, alpha: 0.2 },
    { x: 0.55, y: 0.55, len: 0.36, angle: 0.35, w: 44, alpha: 0.1 },
    { x: 0.7, y: 0.3, len: 0.32, angle: 0.6, w: 30, alpha: 0.08 }
  ]
  ctx.lineCap = "round"
  for (const s of streaks) {
    // layered passes: wide faint -> narrow brighter, so streaks have no hard core
    for (const [wMul, aMul] of [[3.2, 0.2], [1.9, 0.3], [1, 0.42]]) {
      ctx.strokeStyle = `rgba(205, 228, 224, ${s.alpha * aMul})`
      ctx.lineWidth = s.w * wMul
      ctx.shadowColor = `rgba(180, 220, 220, ${s.alpha * aMul})`
      ctx.shadowBlur = 70
      ctx.beginPath()
      ctx.moveTo(s.x * size, s.y * size)
      ctx.lineTo(
        (s.x + Math.cos(s.angle) * s.len) * size,
        (s.y + Math.sin(s.angle) * s.len) * size
      )
      ctx.stroke()
    }
  }
  ctx.shadowBlur = 0

  // heavy teal-tinted grain
  const image = ctx.getImageData(0, 0, size, size)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 84
    data[i] += n * 0.5
    data[i + 1] += n
    data[i + 2] += n * 0.9
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}
