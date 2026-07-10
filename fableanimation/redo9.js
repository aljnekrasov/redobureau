import * as THREE from "three"

// Lēcas: the op-art field from Svītras — striped margins, green zone, dot
// grid with a cylindrical belly, gold redo printed in the middle — but now
// two spherical lenses roam the canvas. Everything they pass over bulges:
// dots swell at a lens's centre and squash into grain at its rim, the
// stripes bend, and the logotype swells as the glass slides across it.
// One lens wanders on its own; the other follows the cursor.

const CELL_SHARE = 34 // dot cells per viewport height
const DOT_R = 0.36
const FLOW = 0.4 // cells per second the texture rolls
const LOGO_SHARE = 0.72 // of the green zone width

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let cursorX = width * 0.68
let cursorY = height * 0.35
let energy = 0
let lastClientX = null
let lastClientY = null

const canvas = document.getElementById("scene_root")

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)

const scene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

// -- logo mask ----------------------------------------------------------------------

const maskCanvas = document.createElement("canvas")
maskCanvas.width = 2048
maskCanvas.height = 560
const maskTexture = new THREE.CanvasTexture(maskCanvas)
maskTexture.minFilter = THREE.LinearFilter
maskTexture.generateMipmaps = false

const maskFrac = { x: 1 }

fetch("redo-logo.svg")
  .then(r => r.text())
  .then(svg => {
    const sized = svg
      .replace(/currentColor/g, "#ffffff")
      .replace("<svg ", '<svg width="1840.49" height="468.42" ')
    const blob = new Blob([sized], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const ctx = maskCanvas.getContext("2d")
      const scale = Math.min((2048 * 0.94) / img.width, (560 * 0.88) / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      ctx.clearRect(0, 0, 2048, 560)
      ctx.drawImage(img, (2048 - dw) / 2, (560 - dh) / 2, dw, dh)
      maskFrac.x = dw / 2048
      maskTexture.needsUpdate = true
      URL.revokeObjectURL(url)
      applySize()
    }
    img.src = url
  })

// -- fullscreen shader ----------------------------------------------------------------

const uniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(width, height) },
  uMask: { value: maskTexture },
  uL1: { value: new THREE.Vector3(0, 0, 0) }, // wandering lens: x, y, R
  uL2: { value: new THREE.Vector3(0, 0, 0) }, // cursor lens
  uCell: { value: 22 },
  uFlow: { value: FLOW },
  uRad: { value: DOT_R },
  uRcyl: { value: 500 },
  uCy: { value: 360 },
  uLogoW: { value: 500 },
  uLogoH: { value: 130 }
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
    uniform sampler2D uMask;
    uniform vec3 uL1;
    uniform vec3 uL2;
    uniform float uCell;
    uniform float uFlow;
    uniform float uRad;
    uniform float uRcyl;
    uniform float uCy;
    uniform float uLogoW;
    uniform float uLogoH;

    // orthographic sphere lens: coordinates inside slow down toward the
    // centre (magnifying what's under the glass) and race at the rim, so
    // dots fatten in the middle and shear into grain at the edge. the
    // mapping meets the plane exactly at r = R — no seam.
    vec2 lensWarp(vec2 p, vec3 L, inout float shade) {
      if (L.z <= 0.0) return p;
      vec2 d = p - L.xy;
      float r = length(d);
      if (r >= L.z) return p;
      float nr = clamp(r / L.z, 0.0, 0.9995);
      float arc = asin(nr) * 0.6366198; // 2/pi
      shade += (1.0 - nr * nr) * 0.12 - smoothstep(0.78, 1.0, nr) * 0.42;
      vec2 dir = r > 0.001 ? d / r : vec2(0.0);
      return L.xy + dir * (L.z * arc);
    }

    vec3 stripes(float x) {
      float m = min(x, 1.0 - x);
      vec3 yellow = vec3(0.882, 0.631, 0.231);
      vec3 red    = vec3(0.808, 0.255, 0.153);
      vec3 cream  = vec3(0.937, 0.906, 0.808);
      vec3 green  = vec3(0.118, 0.424, 0.235);
      vec3 blue   = vec3(0.180, 0.384, 0.651);
      vec3 deepg  = vec3(0.078, 0.322, 0.180);
      if (m < 0.045) return yellow;
      if (m < 0.095) return mix(yellow, red, smoothstep(0.045, 0.095, m));
      if (m < 0.115) return red;
      if (m < 0.125) return cream;
      if (m < 0.142) return green;
      if (m < 0.150) return cream;
      if (m < 0.163) return blue;
      if (m < 0.180) return red;
      if (m < 0.205) return deepg;
      return vec3(0.106, 0.420, 0.231);
    }

    void main() {
      vec2 p = gl_FragCoord.xy;
      float shade = 0.0;

      // cursor glass first (it rides on top), then the wanderer
      vec2 q = lensWarp(p, uL2, shade);
      q = lensWarp(q, uL1, shade);

      float xn = q.x / uRes.x;
      vec3 col = stripes(xn);

      float zl = 0.205 * uRes.x;
      float zr = 0.795 * uRes.x;
      if (q.x > zl && q.x < zr) {
        float yc = (q.y - uCy) / uRcyl;
        if (abs(yc) < 0.9995) {
          float th = asin(yc);
          float s = th * uRcyl; // arc length up the base cylinder

          // green base with a warm belly glow, in warped space so the
          // glow bends through the lenses too
          float gx = (q.x - uRes.x * 0.5) / (0.20 * uRes.x);
          float gy = s / (0.34 * uRes.y);
          float glow = exp(-(gx * gx + gy * gy));
          vec3 base = mix(vec3(0.058, 0.24, 0.135), vec3(0.129, 0.459, 0.259),
                          1.0 - abs(yc) * 0.85);
          col = mix(base, vec3(0.807, 0.786, 0.310), glow * 0.8);

          // the rolling dot grid
          float u = q.x / uCell;
          float v = s / uCell + uTime * uFlow;
          vec2 cell = vec2(fract(u), fract(v)) - 0.5;
          float d = length(cell);

          // the logotype, printed on the same warped surface
          float mu = clamp((q.x - uRes.x * 0.5) / uLogoW + 0.5, 0.0, 1.0);
          float mv = clamp(s / uLogoH + 0.5, 0.0, 1.0);
          float logo = step(0.5, texture2D(uMask, vec2(mu, mv)).a);

          float rad = mix(uRad, uRad * 1.22, logo);
          float aa = fwidth(d) * 1.3 + 0.012;
          float m = 1.0 - smoothstep(rad - aa, rad + aa, d);
          vec3 dotCol = mix(vec3(0.027, 0.098, 0.059), vec3(0.914, 0.784, 0.243), logo);
          col = mix(col, dotCol, m);
        }
      }

      col *= 1.0 + shade;
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

  renderer.setSize(width, height, false)
  uniforms.uRes.value.set(width, height)
  uniforms.uCell.value = height / CELL_SHARE
  uniforms.uRcyl.value = height * 0.62
  uniforms.uCy.value = height * 0.5

  const zoneW = width * 0.59
  const logoW = (zoneW * LOGO_SHARE) / maskFrac.x
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
  cursorX = event.clientX
  cursorY = height - event.clientY // gl coords are y-up

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
let lx = 0
let ly = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()

  const dt = Math.min(clock.getDelta(), 0.05)
  energy *= Math.pow(0.25, dt)
  t += dt * (1 + energy * 0.8)
  uniforms.uTime.value = t

  // the wanderer drifts a wide lissajous — it crosses the logotype and
  // moves on, so the word gets its clear moments too
  uniforms.uL1.value.set(
    width * (0.5 + 0.30 * Math.sin(t * 0.19)),
    height * (0.5 + 0.34 * Math.sin(t * 0.127 + 1.7)),
    height * 0.29 * (1 + 0.08 * Math.sin(t * 0.31))
  )

  // the cursor glass eases after the pointer and swells with motion
  lx += (cursorX - lx) * (1 - Math.pow(0.002, dt))
  ly += (cursorY - ly) * (1 - Math.pow(0.002, dt))
  uniforms.uL2.value.set(lx, ly, height * (0.17 + energy * 0.05))

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, material, uniforms, render }
