import * as THREE from "three"

// Audums: the op-art diptych played as textile. The whole artwork — striped
// margins, green field, rolling dots, the gold redo — is woven into a banner
// hung from a rod, and the wind moves through it. The circles now distort
// the third way: real 3d folds, foreshortened by the camera, stretch and
// squash them as the cloth billows. Mouse movement is the wind.

const CLOTH_W = 8
const CLOTH_H = 10.2
const SEG_X = 180
const SEG_Y = 220
const CELL = CLOTH_W / 54 // square dot cell in cloth units
const FLOW = 0.35 // cells per second the dot grid rolls
const LOGO_SHARE = 0.74 // of the cloth width

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

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x181310)

const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 120)

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
      applyLogoSize()
    }
    img.src = url
  })

// -- cloth --------------------------------------------------------------------------

const uniforms = {
  uTime: { value: 0 },
  uGust: { value: 1 },
  uMask: { value: maskTexture },
  uSize: { value: new THREE.Vector2(CLOTH_W, CLOTH_H) },
  uCell: { value: CELL },
  uFlow: { value: FLOW },
  uLogoW: { value: CLOTH_W * LOGO_SHARE },
  uLogoH: { value: (CLOTH_W * LOGO_SHARE) / (2048 / 560) }
}

function applyLogoSize() {
  const w = (CLOTH_W * LOGO_SHARE) / maskFrac.x
  uniforms.uLogoW.value = w
  uniforms.uLogoH.value = w / (2048 / 560)
}

const material = new THREE.ShaderMaterial({
  uniforms,
  side: THREE.DoubleSide,
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uGust;
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      vUv = uv;
      float t = uTime;

      // hung from the rod: calm at the top, billowing toward the hem
      float drop = 1.0 - uv.y;
      float amp = uGust * (0.10 + 0.72 * drop * drop);

      float a1 = dot(position.xy, vec2(0.9, 0.55)) * 1.15 - t * 1.25;
      float a2 = dot(position.xy, vec2(-0.55, 0.95)) * 1.7 + t * 0.9;
      float a3 = position.y * 0.8 + t * 0.6;

      float z = amp * (0.55 * sin(a1) + 0.30 * sin(a2)) + 0.32 * drop * sin(a3);

      // analytic slope of the main terms gives the fold normals
      float dzdx = amp * (0.55 * cos(a1) * 1.035 - 0.30 * cos(a2) * 0.935);
      float dzdy = amp * (0.55 * cos(a1) * 0.633 + 0.30 * cos(a2) * 1.615)
                 + 0.32 * drop * cos(a3) * 0.8;

      vec3 p = vec3(position.xy, z);
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      vN = normalMatrix * normalize(vec3(-dzdx, -dzdy, 1.0));
      vV = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform sampler2D uMask;
    uniform vec2 uSize;
    uniform float uCell;
    uniform float uFlow;
    uniform float uLogoW;
    uniform float uLogoH;
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vV;

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
      vec3 col = stripes(vUv.x);

      if (vUv.x > 0.205 && vUv.x < 0.795) {
        // woven green field with the warm belly glow
        float gx = (vUv.x - 0.5) / 0.30;
        float gy = (vUv.y - 0.5) / 0.24;
        float glow = exp(-(gx * gx + gy * gy));
        vec3 base = mix(vec3(0.058, 0.24, 0.135), vec3(0.129, 0.459, 0.259),
                        1.0 - abs(vUv.y - 0.5) * 1.4);
        col = mix(base, vec3(0.807, 0.786, 0.310), glow * 0.8);

        // the rolling dot grid, square cells in cloth units
        float u = (vUv.x * uSize.x) / uCell;
        float v = (vUv.y * uSize.y) / uCell + uTime * uFlow;
        vec2 cell = vec2(fract(u), fract(v)) - 0.5;
        float d = length(cell);

        float mu = clamp((vUv.x - 0.5) * uSize.x / uLogoW + 0.5, 0.0, 1.0);
        float mv2 = clamp((vUv.y - 0.5) * uSize.y / uLogoH + 0.5, 0.0, 1.0);
        float logo = step(0.5, texture2D(uMask, vec2(mu, mv2)).a);

        float rad = mix(0.36, 0.40, logo);
        float aa = fwidth(d) * 1.3 + 0.012;
        float m = 1.0 - smoothstep(rad - aa, rad + aa, d);
        vec3 dotCol = mix(vec3(0.027, 0.098, 0.059), vec3(0.914, 0.784, 0.243), logo);
        col = mix(col, dotCol, m);
      }

      // cloth shading: folds light up and fall into shadow, plus a soft sheen
      vec3 N = normalize(vN);
      vec3 V = normalize(vV);
      vec3 L = normalize(vec3(0.35, 0.5, 0.8));
      float ndl = abs(dot(N, L));
      float shade = 0.42 + 0.58 * ndl;
      float spec = pow(max(dot(reflect(-L, N), V), 0.0), 14.0) * 0.12;
      gl_FragColor = vec4(col * shade + spec, 1.0);
    }
  `
})

const group = new THREE.Group()
scene.add(group)

const cloth = new THREE.Mesh(
  new THREE.PlaneGeometry(CLOTH_W, CLOTH_H, SEG_X, SEG_Y),
  material
)
group.add(cloth)

// the rod the banner hangs from
const rod = new THREE.Mesh(
  new THREE.CylinderGeometry(0.07, 0.07, CLOTH_W * 1.1, 20),
  new THREE.MeshBasicMaterial({ color: 0x4a4038 })
)
rod.rotation.z = Math.PI / 2
rod.position.y = CLOTH_H / 2 + 0.05
group.add(rod)

// -- sizing -------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  windowHalfX = width / 2
  windowHalfY = height / 2

  camera.aspect = width / height
  const fitH = (CLOTH_H / 2 + 0.4) / 0.86
  const fitW = (CLOTH_W / 2 + 0.6) / 0.9 /
    (Math.tan((camera.fov * Math.PI) / 360) * camera.aspect /
     Math.tan((camera.fov * Math.PI) / 360))
  camera.position.z = Math.max(
    fitH / Math.tan((camera.fov * Math.PI) / 360),
    (CLOTH_W / 2 + 0.6) / 0.9 /
      (Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  )
  camera.updateProjectionMatrix()

  renderer.setSize(width, height, false)
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
  mouseX = ((event.clientX - windowHalfX) / windowHalfX) * 1.0
  mouseY = ((event.clientY - windowHalfY) / windowHalfY) * 0.7

  if (lastClientX !== null) {
    const speed =
      Math.hypot(event.clientX - lastClientX, event.clientY - lastClientY) /
      Math.max(width, height)
    energy = Math.min(energy + speed * 6, 1.6)
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
  t += dt * (0.9 + energy * 1.4)

  uniforms.uTime.value = t
  uniforms.uGust.value = 1 + energy * 0.7

  group.rotation.y = Math.sin(t * 0.1) * 0.07 + mouseX * 0.16
  group.rotation.x = Math.cos(t * 0.08) * 0.03 - mouseY * 0.08

  camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.05
  camera.position.y += (-mouseY * 0.8 - camera.position.y) * 0.05
  camera.lookAt(scene.position)

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, group, material, uniforms, render }
