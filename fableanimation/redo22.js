import * as THREE from "three"

// Nobide: slit-scan poster. The mark sits huge and black on paper while a
// slow camera pans, zooms and tilts across it — but every thin horizontal
// slice of the screen sees the camera at its own delayed moment. When the
// drift accelerates, the slices lag apart and the letterforms double,
// shear and stutter, then breathe back together. Ink stays ink: the time
// echoes union in pure black, like the reference.

const LOGO_SHARE = 0.78 // of viewport width at zoom 1
const SLICE_H = 7 // slice height in px

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

// -- logo mask ------------------------------------------------------------------------

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
      const g = maskCanvas.getContext("2d")
      const scale = Math.min((2048 * 0.94) / img.width, (560 * 0.88) / img.height)
      const dw = img.width * scale
      const dh = img.height * scale
      g.clearRect(0, 0, 2048, 560)
      g.drawImage(img, (2048 - dw) / 2, (560 - dh) / 2, dw, dh)
      maskFrac.x = dw / 2048
      maskTexture.needsUpdate = true
      URL.revokeObjectURL(url)
      applySize()
    }
    img.src = url
  })

// -- slit-scan shader -----------------------------------------------------------------

const uniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(width, height) },
  uMask: { value: maskTexture },
  uSliceH: { value: SLICE_H },
  uLogoW: { value: 900 },
  uLogoH: { value: 250 },
  uLag: { value: 1 }, // lag amplitude, grows with cursor energy
  uMouse: { value: new THREE.Vector2(0, 0) }
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
    uniform float uSliceH;
    uniform float uLogoW;
    uniform float uLogoH;
    uniform float uLag;
    uniform vec2 uMouse;

    float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
    float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

    // the wandering eye: pan, zoom and tilt as smooth functions of time
    vec2 eye(vec2 q, float tt) {
      float zoom = 1.12 + 0.28 * sin(tt * 0.16)
                 + 0.10 * sin(tt * 0.057 + 2.0);
      float ang = 0.055 * sin(tt * 0.11 + 1.0);
      vec2 pan = vec2(
        0.34 * sin(tt * 0.083) + uMouse.x * 0.10,
        0.16 * sin(tt * 0.127 + 3.0) + uMouse.y * 0.06
      );
      float ca = cos(ang), sa = sin(ang);
      q = vec2(q.x * ca - q.y * sa, q.x * sa + q.y * ca);
      return q / zoom + pan;
    }

    float ink(vec2 q) {
      vec2 uv = vec2(q.x / uLogoW + 0.5, q.y / uLogoH + 0.5);
      if (uv.x <= 0.0 || uv.x >= 1.0 || uv.y <= 0.0 || uv.y >= 1.0) return 0.0;
      return texture2D(uMask, uv).a;
    }

    void main() {
      vec2 p = gl_FragCoord.xy;
      vec2 q = (p - 0.5 * uRes) / uRes.y;

      // every slice lives at its own delayed moment; the delays re-deal
      // themselves a couple of times a second, band by band
      float band = floor(p.y / uSliceH);
      float epoch = floor(uTime * 2.3 + hash(band) * 0.9);
      float lag1 = (0.06 + 0.40 * hash2(vec2(band, epoch))) * uLag;
      float lag2 = lag1 + (0.08 + 0.45 * hash2(vec2(band + 57.0, epoch))) * uLag;
      // a permanent hairline jitter so the sheet always reads as sliced
      float jit = (hash2(vec2(band, epoch + 31.0)) - 0.5) * 0.004;

      float m = ink(eye(q + vec2(jit, 0.0), uTime));
      m = max(m, ink(eye(q + vec2(jit, 0.0), uTime - lag1)));
      m = max(m, ink(eye(q - vec2(jit, 0.0), uTime - lag2)));

      // paper and ink, nothing else
      vec3 paper = vec3(0.965, 0.955, 0.935);
      paper *= 1.0 - 0.05 * smoothstep(0.4, 1.1, length(q)); // breath of vignette
      vec3 col = mix(paper, vec3(0.075, 0.07, 0.068), smoothstep(0.35, 0.65, m));
      gl_FragColor = vec4(col, 1.0);
    }
  `
})

scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material))

// -- sizing ---------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  renderer.setSize(width, height, false)
  uniforms.uRes.value.set(width, height)

  // logo span in the shader's centred, height-normalised units
  const aspect = width / height
  const logoW = (LOGO_SHARE * aspect) / maskFrac.x
  uniforms.uLogoW.value = logoW
  uniforms.uLogoH.value = logoW / (2048 / 560)
}

applySize()
window.addEventListener("resize", applySize, false)

// -- interaction ----------------------------------------------------------------------

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
    energy = Math.min(energy + speed * 6, 1.8)
  }
  lastClientX = event.clientX
  lastClientY = event.clientY
}

// -- loop -----------------------------------------------------------------------------

const clock = new THREE.Clock()
let t = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()

  const dt = Math.min(clock.getDelta(), 0.05)
  energy *= Math.pow(0.35, dt)
  t += dt

  uniforms.uTime.value = t
  // calm drift doubles gently; stirring the cursor tears the slices apart
  uniforms.uLag.value = 0.45 + energy * 1.2
  uniforms.uMouse.value.set(mouseX, -mouseY)

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, uniforms, render }
