import * as THREE from "three"

// Svītras: the op-art diptych from the reference, rebuilt as a live poster.
// Two green panels inside a field of warm airbrushed stripes; each panel
// carries a grid of dots wrapped around a virtual cylinder — rows stretch
// into tall ellipses at the belly and compress to grains at the edges, and
// the whole texture rolls upward. The redo logotype is printed on that same
// cylinder in gold dots, so it bulges with the surface while the dark dots
// stream through it.

const COLS = 13 // dot columns per panel
const DOT_R = 0.37 // dot radius in cell units
const FLOW = 0.5 // cells per second the texture rolls
const LOGO_SHARE = 0.82 // logo width as a share of the central zone

let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let windowHalfX = width / 2
let windowHalfY = height / 2

let mouseX = 0
let mouseY = 0
let lastClientX = null
let lastClientY = null
let energy = 0

const canvas = document.getElementById("scene_root")

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)

const scene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

// -- painted background (stripes, panels, glow) -------------------------------------

const bgCanvas = document.createElement("canvas")
const bgTexture = new THREE.CanvasTexture(bgCanvas)
bgTexture.colorSpace = THREE.SRGBColorSpace
bgTexture.minFilter = THREE.LinearFilter
bgTexture.generateMipmaps = false

// layout shared between the painter and the shader, recomputed on resize
const layout = { zoneL: 0, zoneR: 0, p1: [0, 0, 0, 0], p2: [0, 0, 0, 0], cellW: 20 }

function paintBackground(w, h) {
  bgCanvas.width = w
  bgCanvas.height = h
  const ctx = bgCanvas.getContext("2d")

  const zoneW = Math.min(w * 0.46, h * 0.9)
  const zoneL = (w - zoneW) / 2
  const zoneR = zoneL + zoneW
  const divider = Math.max(10, zoneW * 0.024)
  const panelW = (zoneW - divider) / 2
  const insetY = Math.max(10, h * 0.016)

  layout.zoneL = zoneL
  layout.zoneR = zoneR
  // panel rects in gl coords (y up): [left, right, bottom, top]
  layout.p1 = [zoneL, zoneL + panelW, insetY, h - insetY]
  layout.p2 = [zoneR - panelW, zoneR, insetY, h - insetY]
  layout.cellW = panelW / COLS

  // the margin stripes, mirrored left/right; fractions of the margin width
  const M = zoneL
  const bands = [
    [0.0, 0.62, null], // painted below as the airbrushed yellow-red field
    [0.62, 0.66, "#E1A13B"],
    [0.66, 0.685, "#EFE7CE"],
    [0.685, 0.75, "#C93E27"],
    [0.75, 0.77, "#1E6C3C"],
    [0.77, 0.79, "#EFE7CE"],
    [0.79, 0.815, "#2E62A6"],
    [0.815, 0.9, "#186038"],
    [0.9, 0.92, "#2E62A6"],
    [0.92, 0.945, "#C93E27"],
    [0.945, 1.0, "#14522F"]
  ]

  // airbrushed field: wide yellow edge, red core near the stripes
  const bloom = ctx.createLinearGradient(0, 0, M * 0.62, 0)
  bloom.addColorStop(0, "#E4A83E")
  bloom.addColorStop(0.48, "#E1A13B")
  bloom.addColorStop(0.68, "#DE7A31")
  bloom.addColorStop(0.88, "#CE4127")
  bloom.addColorStop(1, "#D0522B")

  for (const side of [0, 1]) {
    ctx.save()
    if (side === 1) {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.fillStyle = bloom
    ctx.fillRect(0, 0, M * 0.62 + 1, h)
    for (const [a, b, color] of bands) {
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(M * a - 0.5, 0, M * (b - a) + 1, h)
    }
    ctx.restore()
  }

  // central zone base
  ctx.fillStyle = "#0E3B21"
  ctx.fillRect(zoneL, 0, zoneW, h)

  // the two panels: cream frame, deep green base, warm central glow
  for (const rect of [layout.p1, layout.p2]) {
    const [l, r] = rect
    const pw = r - l

    ctx.fillStyle = "#E9E0C6"
    ctx.fillRect(l - 3, insetY - 3, pw + 6, h - insetY * 2 + 6)

    const base = ctx.createLinearGradient(0, insetY, 0, h - insetY)
    base.addColorStop(0, "#155230")
    base.addColorStop(0.5, "#217544")
    base.addColorStop(1, "#155230")
    ctx.fillStyle = base
    ctx.fillRect(l, insetY, pw, h - insetY * 2)

    // glow strongest at the belly, like the reference
    ctx.save()
    ctx.beginPath()
    ctx.rect(l, insetY, pw, h - insetY * 2)
    ctx.clip()
    ctx.translate(l + pw / 2, h / 2)
    ctx.scale(1, (h * 0.46) / (pw * 0.8))
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, pw * 0.8)
    glow.addColorStop(0, "rgba(211, 204, 79, 0.95)")
    glow.addColorStop(0.45, "rgba(150, 170, 60, 0.5)")
    glow.addColorStop(1, "rgba(150, 170, 60, 0)")
    ctx.fillStyle = glow
    ctx.fillRect(-pw, -pw * 2, pw * 2, pw * 4)
    ctx.restore()
  }

  // wooden divider
  const dl = zoneL + panelW
  ctx.fillStyle = "#D8BE92"
  ctx.fillRect(dl, 0, divider, h)
  ctx.fillStyle = "#B3946A"
  ctx.fillRect(dl, 0, 1.5, h)
  ctx.fillRect(dl + divider - 1.5, 0, 1.5, h)

  bgTexture.needsUpdate = true
}

// -- logo mask ----------------------------------------------------------------------

const maskCanvas = document.createElement("canvas")
maskCanvas.width = 2048
maskCanvas.height = 560
const maskTexture = new THREE.CanvasTexture(maskCanvas)
// no mips: derivative jumps at the sampling window's edge pick bad levels
// and smear hairlines around the logotype
maskTexture.minFilter = THREE.LinearFilter
maskTexture.generateMipmaps = false

// share of the mask actually covered by the artwork, set once it's drawn
const maskFrac = { x: 1, y: 468.42 / 560 }

fetch("redo-logo.svg")
  .then(r => r.text())
  .then(svg => {
    // the svg carries only a viewBox — give it explicit dimensions so the
    // browser reports the true aspect instead of a 300x150 default
    const sized = svg
      .replace(/currentColor/g, "#ffffff")
      .replace("<svg ", '<svg width="1840.49" height="468.42" ')
    const blob = new Blob([sized], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const ctx = maskCanvas.getContext("2d")
      // 6% transparent border on every side keeps edge-clamp sampling clean
      const scale = Math.min((2048 * 0.94) / img.width, (560 * 0.88) / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.clearRect(0, 0, 2048, 560)
      ctx.drawImage(img, (2048 - dw) / 2, (560 - dh) / 2, dw, dh)
      maskFrac.x = dw / 2048
      maskFrac.y = dh / 560
      maskTexture.needsUpdate = true
      URL.revokeObjectURL(url)
      applySize()
    }
    img.src = url
  })

// -- fullscreen dot shader ------------------------------------------------------------

const uniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(width, height) },
  uBg: { value: bgTexture },
  uMask: { value: maskTexture },
  uP1: { value: new THREE.Vector4() },
  uP2: { value: new THREE.Vector4() },
  uCellW: { value: 20 },
  uR: { value: 400 },
  uCy: { value: 360 },
  uFlow: { value: FLOW },
  uRad: { value: DOT_R },
  uLogoW: { value: 500 },
  uLogoH: { value: 130 },
  uMaskAR: { value: 2048 / 560 },
  uGold: { value: new THREE.Color("#E9C83E") },
  uDark: { value: new THREE.Color("#07190F") }
}

const material = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: /* glsl */ `
    void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform vec2 uRes;
    uniform sampler2D uBg;
    uniform sampler2D uMask;
    uniform vec4 uP1;
    uniform vec4 uP2;
    uniform float uCellW;
    uniform float uR;
    uniform float uCy;
    uniform float uFlow;
    uniform float uRad;
    uniform float uLogoW;
    uniform float uLogoH;
    uniform vec3 uGold;
    uniform vec3 uDark;

    void main() {
      vec2 p = gl_FragCoord.xy;
      vec3 col = texture2D(uBg, p / uRes).rgb;

      vec4 P = vec4(0.0);
      if (p.x >= uP1.x && p.x <= uP1.y && p.y >= uP1.z && p.y <= uP1.w) P = uP1;
      else if (p.x >= uP2.x && p.x <= uP2.y && p.y >= uP2.z && p.y <= uP2.w) P = uP2;

      if (P.y > 0.0) {
        float yc = (p.y - uCy) / uR;
        if (abs(yc) < 0.995) {
          // wrap the grid around a horizontal-axis cylinder: equal steps in
          // angle read as tall ellipses at the belly, grains at the rims
          float th = asin(yc);
          float s = th * uR; // arc length up the surface
          float u = (p.x - P.x) / uCellW;
          float v = s / uCellW + uTime * uFlow;
          vec2 cell = vec2(fract(u), fract(v)) - 0.5;
          float d = length(cell);

          // the logotype lives on the same surface, static while dots roll;
          // sampled unconditionally — the mask has clean transparent borders
          float mu = clamp((p.x - uRes.x * 0.5) / uLogoW + 0.5, 0.0, 1.0);
          float mv = clamp(s / uLogoH + 0.5, 0.0, 1.0);
          float logo = step(0.5, texture2D(uMask, vec2(mu, mv)).a);

          float rad = mix(uRad, uRad * 1.22, logo);
          float aa = fwidth(d) * 1.3 + 0.012;
          float m = 1.0 - smoothstep(rad - aa, rad + aa, d);
          vec3 dotCol = mix(uDark, uGold, logo);
          col = mix(col, dotCol, m);
        }
      }

      gl_FragColor = vec4(col, 1.0);
    }
  `
})

scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material))

// -- sizing -------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  windowHalfX = width / 2
  windowHalfY = height / 2

  renderer.setSize(width, height, false)
  paintBackground(width, height)

  uniforms.uRes.value.set(width, height)
  uniforms.uP1.value.fromArray(layout.p1)
  uniforms.uP2.value.fromArray(layout.p2)
  uniforms.uCellW.value = layout.cellW
  uniforms.uR.value = height * 0.505
  uniforms.uCy.value = height * 0.5
  // the artwork covers only a fraction of the mask — scale the sampling
  // window so the visible logo, not the mask, spans LOGO_SHARE of the zone
  const logoW = ((layout.zoneR - layout.zoneL) * LOGO_SHARE) / maskFrac.x
  uniforms.uLogoW.value = logoW
  uniforms.uLogoH.value = logoW / (2048 / 560)
}

applySize()
window.addEventListener("resize", applySize, false)

// -- interaction --------------------------------------------------------------------

canvas.addEventListener("mousemove", onPointerMove, false)
canvas.addEventListener("touchmove", e => {
  e.preventDefault()
  onPointerMove(e.targetTouches[0])
}, { passive: false })

function onPointerMove(event) {
  mouseX = (event.clientX - windowHalfX) / windowHalfX
  mouseY = (event.clientY - windowHalfY) / windowHalfY

  if (lastClientX !== null) {
    const speed =
      Math.hypot(event.clientX - lastClientX, event.clientY - lastClientY) /
      Math.max(width, height)
    energy = Math.min(energy + speed * 6, 1.4)
  }
  lastClientX = event.clientX
  lastClientY = event.clientY
}

// -- loop ---------------------------------------------------------------------------

const clock = new THREE.Clock()
let t = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()

  const dt = Math.min(clock.getDelta(), 0.05)
  energy *= Math.pow(0.25, dt)
  t += dt * (1 + energy * 1.6)

  uniforms.uTime.value = t
  // the cursor nudges the bulge centre a little
  uniforms.uCy.value = height * (0.5 - mouseY * 0.04)

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, material, uniforms, render, layout }
