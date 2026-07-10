import * as THREE from "three"

// Rulli: the mangle. Two glossy rollers meet in a horizontal nip across the
// middle of the screen; the upper surface rolls down, the lower rolls up,
// and the redo logotype — printed on both drums in cycling colours — keeps
// being carried into the seam, squashing flatter and flatter as the
// cylinder mapping compresses it, until the mark vanishes into the pinch.
// It never comes back out. Parquet under the machine, like the reference.

const PERIOD = 3.2 // pattern repeat along a drum, in logo-band heights
const SPEED = 0.34 // band heights per second fed into the nip
const LOGO_SHARE = 0.56 // of viewport width

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0
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

// -- the mangle -----------------------------------------------------------------------

const uniforms = {
  uTime: { value: 0 },
  uRes: { value: new THREE.Vector2(width, height) },
  uMask: { value: maskTexture },
  uNipY: { value: 400 },
  uWoodY: { value: 90 },
  uLogoW: { value: 700 },
  uBandH: { value: 190 },
  uPeriod: { value: PERIOD },
  uSpeed: { value: SPEED },
  uShift: { value: 0 }
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
    uniform float uNipY;
    uniform float uWoodY;
    uniform float uLogoW;
    uniform float uBandH;
    uniform float uPeriod;
    uniform float uSpeed;
    uniform float uShift;

    float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

    // ink colours cycling per pass, like the reference's gem letters
    vec3 passColor(float idx) {
      float m = mod(idx, 4.0);
      if (m < 1.0) return vec3(0.10, 0.10, 0.12);   // ink black
      if (m < 2.0) return vec3(0.13, 0.55, 0.34);   // green
      if (m < 3.0) return vec3(0.82, 0.16, 0.18);   // red
      return vec3(0.24, 0.28, 0.72);                // blue
    }

    void main() {
      vec2 p = gl_FragCoord.xy;

      // parquet under the machine
      if (p.y < uWoodY) {
        float k = (p.x + (uWoodY - p.y) * 2.2);
        float plank = mod(floor(k / 90.0), 2.0);
        float ph = hash(floor(k / 90.0) + 7.0);
        vec3 wood = mix(vec3(0.42, 0.30, 0.19), vec3(0.55, 0.41, 0.27), ph * 0.7 + plank * 0.3);
        wood *= 0.7 + 0.3 * smoothstep(0.0, uWoodY, p.y);
        // the machine throws a shadow on the floor
        wood *= 0.55 + 0.45 * smoothstep(0.0, uWoodY * 0.9, uWoodY - p.y);
        gl_FragColor = vec4(wood, 1.0);
        return;
      }

      // which drum
      bool upper = p.y >= uNipY;
      float R = upper ? (uRes.y - uNipY) * 0.5 : (uNipY - uWoodY) * 0.5;
      float cy = upper ? uNipY + R : uNipY - R;
      float yc = clamp((p.y - cy) / R, -0.9995, 0.9995);
      float th = asin(yc);
      float s = th * R; // arc length on the drum surface

      // both surfaces feed INTO the nip: the upper drum's texture moves
      // down, the lower drum's moves up
      float feed = uTime * uSpeed * uBandH;
      float v = upper ? (s + feed) : (-s + feed + uPeriod * uBandH * 0.5);

      // drum body: glossy pale blue, bright at the belly, crushed dark at
      // the seam and the outer silhouettes
      float belly = cos(th);
      vec3 drum = mix(vec3(0.44, 0.62, 0.74), vec3(0.78, 0.90, 0.97), belly);
      drum += vec3(1.0) * pow(belly, 24.0) * 0.18;                  // long sheen
      drum *= 0.72 + 0.28 * smoothstep(0.0, R * 0.5, abs(p.y - cy)); // roundness

      // the printed mark, tiled along the drum
      float cycle = uPeriod * uBandH;
      float local = mod(v, cycle);
      float idx = floor(v / cycle);
      float mu = clamp((p.x - uRes.x * 0.5 - uShift) / uLogoW + 0.5, 0.0, 1.0);
      float mv = local / uBandH;
      float logo = 0.0;
      if (mv > 0.0 && mv < 1.0) {
        // the lower drum shows the mark upright; the upper one carries it
        // toward the seam head-first
        float sampleV = upper ? mv : 1.0 - mv;
        logo = texture2D(uMask, vec2(mu, sampleV)).a;
      }
      vec3 ink = passColor(idx);
      vec3 col = mix(drum, ink * (0.6 + 0.4 * belly), logo * 0.92);

      // the nip: a hard dark seam with a breath of shadow either side
      float dn = abs(p.y - uNipY);
      col *= 0.35 + 0.65 * smoothstep(0.0, uRes.y * 0.02, dn);
      col *= smoothstep(0.0, 1.5, dn) * 0.35 + 0.65;

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
  uniforms.uNipY.value = height * 0.47
  uniforms.uWoodY.value = height * 0.10

  const logoW = (width * LOGO_SHARE) / maskFrac.x
  uniforms.uLogoW.value = logoW
  uniforms.uBandH.value = logoW / (2048 / 560)
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
  if (lastClientX !== null) {
    const speed =
      Math.hypot(event.clientX - lastClientX, event.clientY - lastClientY) /
      Math.max(width, height)
    energy = Math.min(energy + speed * 6, 1.6)
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
  energy *= Math.pow(0.3, dt)
  // stirring the cursor makes the mangle hungrier
  t += dt * (1 + energy * 2.2)

  uniforms.uTime.value = t
  uniforms.uShift.value += (mouseX * width * 0.04 - uniforms.uShift.value) * (1 - Math.pow(0.02, dt))

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, uniforms, render }
