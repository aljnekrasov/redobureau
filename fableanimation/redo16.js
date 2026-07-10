import * as THREE from "three"

// Līnijas: the scanline-neon idea of the reference crossed with Neons 015,
// stripped of the room — no wall, no floor, just black space filled with a
// stack of horizontal lines streaming upward. Most are dim silver strips
// with motion-blur streaks; where a line crosses the invisible redo mask it
// ignites red with a white-hot core, so the word hangs in the dark while
// the lines pour through it. Rows flicker and drop out like tired tubes.

const ROWS = 34 // line pitch: viewport height / ROWS
const SPEED = 26 // px/s the field streams
const LOGO_SHARE = 0.62 // of viewport width

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

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

// -- logo masks: sharp for the segments, blurred for the red bloom -------------------

const maskCanvas = document.createElement("canvas")
maskCanvas.width = 2048
maskCanvas.height = 560
const maskTexture = new THREE.CanvasTexture(maskCanvas)
maskTexture.minFilter = THREE.LinearFilter
maskTexture.generateMipmaps = false

const glowCanvas = document.createElement("canvas")
glowCanvas.width = 1024
glowCanvas.height = 280
const glowTexture = new THREE.CanvasTexture(glowCanvas)
glowTexture.minFilter = THREE.LinearFilter
glowTexture.generateMipmaps = false

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

      const g = glowCanvas.getContext("2d")
      g.clearRect(0, 0, 1024, 280)
      g.filter = "blur(14px)"
      g.drawImage(img, (1024 - dw / 2) / 2, (280 - dh / 2) / 2, dw / 2, dh / 2)
      glowTexture.needsUpdate = true

      URL.revokeObjectURL(url)
      applySize()
    }
    img.src = url
  })

// -- shader -------------------------------------------------------------------------

const uniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(width, height) },
  uMask: { value: maskTexture },
  uGlow: { value: glowTexture },
  uPitch: { value: 24 },
  uSpeed: { value: SPEED },
  uMouse: { value: new THREE.Vector2(0, 0) },
  uLogoW: { value: 700 },
  uLogoH: { value: 190 }
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
    uniform sampler2D uGlow;
    uniform float uPitch;
    uniform float uSpeed;
    uniform vec2 uMouse;
    uniform float uLogoW;
    uniform float uLogoH;

    float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

    void main() {
      vec2 p = gl_FragCoord.xy + uMouse * 14.0;

      // the stack streams upward and wraps
      float rowY = p.y - uTime * uSpeed;
      float row = floor(rowY / uPitch);
      float fy = rowY - (row + 0.5) * uPitch;
      float h1 = hash(row + 3.0);
      float h2 = hash(row + 41.0);

      // line profiles: knife-thin core, soft body, wide wash
      float core = exp(-pow(fy / (uPitch * 0.045), 2.0));
      float body = exp(-pow(fy / (uPitch * 0.16), 2.0));
      float wash = exp(-pow(fy / (uPitch * 0.55), 2.0));

      // dim silver strips, a few of them bright, streaked along their length
      float baseB = mix(0.05, 0.6, pow(h1, 3.0));
      float streak =
        0.66 +
        0.22 * sin(p.x * 0.004 + h1 * 43.0 + uTime * 0.3) +
        0.12 * sin(p.x * 0.0011 + h2 * 91.0 - uTime * 0.17);
      vec3 col = vec3(0.72, 0.76, 0.82) * (core * 0.85 + body * 0.30) * baseB * streak;

      // the word: sampled where this fragment sits on screen — the lines
      // pour through the static mask and ignite red inside it
      vec2 muv = vec2(
        (gl_FragCoord.x - uRes.x * 0.5) / uLogoW + 0.5,
        (gl_FragCoord.y - uRes.y * 0.5) / uLogoH + 0.5
      );
      float m = texture2D(uMask, clamp(muv, 0.0, 1.0)).a;
      float g = texture2D(uGlow, clamp(muv, 0.0, 1.0)).a;

      // per-row hum and the occasional dropout, like a tired tube
      float flick =
        0.84 +
        0.16 * sin(uTime * 43.0 + h1 * 87.0) * sin(uTime * 17.0 + h2 * 31.0);
      if (hash(row + floor(uTime * 5.0) * 0.37) > 0.965) flick *= 0.12;

      vec3 red = vec3(1.0, 0.09, 0.14);
      vec3 hot = vec3(1.0, 0.82, 0.74);
      col += red * (core * 1.5 * m + body * 0.55 * m) * flick;
      col += hot * core * m * flick * 0.75;
      // red wash bleeding past the letter edges, like lens bloom
      col += red * (wash * 0.30 + body * 0.20) * g * flick;

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
  uniforms.uPitch.value = height / ROWS

  const logoW = (width * LOGO_SHARE) / maskFrac.x
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
  mouseX = (event.clientX / width - 0.5) * 2
  mouseY = (event.clientY / height - 0.5) * 2

  if (lastClientX !== null) {
    const speed =
      Math.hypot(event.clientX - lastClientX, event.clientY - lastClientY) /
      Math.max(width, height)
    energy = Math.min(energy + speed * 6, 1.5)
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
  energy *= Math.pow(0.3, dt)
  t += dt * (1 + energy * 1.5)

  uniforms.uTime.value = t
  uniforms.uMouse.value.set(mouseX, -mouseY)

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, material, uniforms, render }
