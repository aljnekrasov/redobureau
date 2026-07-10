import * as THREE from "three"

// Sabrukums: the mark on a destruction cycle. It stands clean and white on
// black, then twin vortices grab the space, the letterforms smear into
// huge liquid shapes while the camera dives in, and just before nothing is
// left the field lets go and the logotype snaps back whole. Stirring the
// cursor feeds the collapse; the calm phase always wins it back.

const LOGO_SHARE = 0.72 // of viewport width when calm

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

// -- destruction shader ---------------------------------------------------------------

const uniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(width, height) },
  uMask: { value: maskTexture },
  uW: { value: 0 }, // destruction envelope 0..~1.5
  uC1: { value: new THREE.Vector2(0, 0) },
  uC2: { value: new THREE.Vector2(0, 0) },
  uLogoW: { value: 1.4 },
  uLogoH: { value: 0.38 }
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
    uniform float uW;
    uniform vec2 uC1;
    uniform vec2 uC2;
    uniform float uLogoW;
    uniform float uLogoH;

    vec2 rot(vec2 v, float a) {
      float c = cos(a), s = sin(a);
      return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
    }

    void main() {
      vec2 q = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      float t = uTime;
      float w = uW;

      // the camera dives in as the field takes hold
      q /= 1.0 + w * 0.9;

      // twin vortices, one clockwise, one counter — the big liquid smears
      vec2 d1 = q - uC1;
      q = uC1 + rot(d1, w * 4.2 * exp(-dot(d1, d1) * 2.4));
      vec2 d2 = q - uC2;
      q = uC2 + rot(d2, -w * 3.4 * exp(-dot(d2, d2) * 3.0));

      // slow broad bends, like the sheet itself buckling
      q += w * 0.30 * vec2(
        sin(q.y * 2.3 + t * 0.55) + 0.5 * sin(q.y * 4.7 - t * 0.31),
        sin(q.x * 1.9 - t * 0.47) + 0.5 * sin(q.x * 3.9 + t * 0.23)
      );

      // the mark
      vec2 uv = vec2(q.x / uLogoW + 0.5, q.y / uLogoH + 0.5);
      float m = 0.0;
      if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
        m = texture2D(uMask, uv).a;
      }

      float aa = fwidth(m) * 0.9 + 0.03;
      float ink = smoothstep(0.5 - aa, 0.5 + aa, m);
      vec3 col = mix(vec3(0.03, 0.03, 0.035), vec3(0.96, 0.955, 0.94), ink);
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
  mouseY = -(event.clientY / height - 0.5) * 2
  if (lastClientX !== null) {
    const speed =
      Math.hypot(event.clientX - lastClientX, event.clientY - lastClientY) /
      Math.max(width, height)
    energy = Math.min(energy + speed * 5, 1.2)
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
  energy *= Math.pow(0.4, dt)
  t += dt

  // the cycle: long calm, steep collapse, recovery — plus whatever the
  // cursor stirs in
  const phase = 0.5 - 0.5 * Math.cos(t * 0.26)
  const w = Math.pow(phase, 1.6) * 1.25 + energy * 0.55
  uniforms.uW.value = w
  uniforms.uTime.value = t

  // vortex cores drift, the first one leans toward the cursor
  uniforms.uC1.value.set(
    0.25 * Math.sin(t * 0.21) + mouseX * 0.3,
    0.15 * Math.sin(t * 0.33 + 1.2) + mouseY * 0.22
  )
  uniforms.uC2.value.set(
    -0.3 * Math.sin(t * 0.17 + 2.6),
    -0.18 * Math.sin(t * 0.27 + 0.6)
  )

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, uniforms, render }
