import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"

// Metals: the original flat mark in engine-turned aluminium. No inflated
// rims, no mold look — the drama is entirely in the light: anisotropic
// fans sweep around the ring bands as two lamps circle low over the foil,
// every band a separate pass of the tool with its own brush angle. The
// cursor steers the lamps.

const LOGO_W = 9
const RING_W = 0.34 // ring band width in logo-plane units

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

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
scene.background = new THREE.Color(0x101013)

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120)

const logoGroup = new THREE.Group()
scene.add(logoGroup)

// -- engine-turned metal --------------------------------------------------------------

const uniforms = {
  uTime: { value: 0 },
  uSpan: { value: new THREE.Vector2(LOGO_W, LOGO_W * 468.42 / 1840.49) },
  uRingW: { value: RING_W },
  uHub: { value: new THREE.Vector2(-2.6, -1.6) }, // brush centre, low left
  uAzi: { value: 0 }
}

const metalMaterial = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: /* glsl */ `
    uniform vec2 uSpan;
    varying vec3 vWPos;
    varying vec3 vWN;
    varying vec3 vTX;
    varying vec3 vTY;
    varying vec2 vLuv;
    varying float vCap;
    void main() {
      vLuv = position.xy / uSpan + 0.5;
      vCap = normal.z;
      vWPos = (modelMatrix * vec4(position, 1.0)).xyz;
      vWN = mat3(modelMatrix) * normal;
      vTX = mat3(modelMatrix) * vec3(1.0, 0.0, 0.0);
      vTY = mat3(modelMatrix) * vec3(0.0, 1.0, 0.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform float uTime;
    uniform vec2 uSpan;
    uniform float uRingW;
    uniform vec2 uHub;
    uniform float uAzi;
    varying vec3 vWPos;
    varying vec3 vWN;
    varying vec3 vTX;
    varying vec3 vTY;
    varying vec2 vLuv;
    varying float vCap;

    float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
    float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
        mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
        f.y);
    }
    // Kajiya-Kay: highlight of a surface brushed along tangent T
    float aniso(vec3 L, vec3 V, vec3 N, vec3 T, float ex) {
      vec3 H = normalize(L - V);
      float th = dot(T, H);
      float s = sqrt(max(0.0, 1.0 - th * th));
      return pow(s, ex) * smoothstep(-0.35, 0.5, dot(N, L));
    }

    void main() {
      // flat foil: the original silhouette, geometric normals only,
      // re-oriented toward the camera (the mirrored y-scale flips winding)
      vec3 N = normalize(vWN);
      vec3 Vpre = normalize(vWPos - cameraPosition);
      if (dot(N, Vpre) > 0.0) N = -N;
      bool wall = abs(vCap) < 0.5;

      vec2 pc = (vLuv - 0.5) * uSpan;
      vec2 d = pc - uHub;
      float r = length(d);
      float theta = atan(d.y, d.x);
      vec2 rad = d / max(r, 1e-4);
      float band = floor(r / uRingW);
      float bh = hash(band + 7.0);

      // every ring is its own tool pass: the brush angle jitters per band,
      // so adjacent rings catch the lamps at different moments
      vec2 tg = vec2(-rad.y, rad.x);
      float ang = (bh - 0.5) * 0.9;
      float ca = cos(ang), sa = sin(ang);
      tg = vec2(tg.x * ca - tg.y * sa, tg.x * sa + tg.y * ca);
      vec3 T = normalize(vTX * tg.x + vTY * tg.y);

      float grain =
        0.62 * vnoise(vec2(r * 42.0, theta * 7.0 + bh * 60.0)) +
        0.38 * vnoise(vec2(r * 120.0, theta * 3.0 + bh * 21.0));

      vec3 V = normalize(vWPos - cameraPosition);

      // lamps circling at different speeds, low over the foil — the bright
      // fans sweep the rings and keep re-interfering
      float sweep = uTime * 0.55 + uAzi;
      vec3 L1 = normalize(vec3(cos(sweep), sin(sweep), 0.38));
      float sweep2 = uTime * 0.31 + 2.1 + uAzi * 0.6;
      vec3 L2 = normalize(vec3(cos(sweep2), sin(sweep2), 0.30));

      float broad1 = aniso(L1, V, N, T, 9.0);
      float hot1   = aniso(L1, V, N, T, 70.0);
      float broad2 = aniso(L2, V, N, T, 12.0);
      float hot2   = aniso(L2, V, N, T, 90.0);

      float lum = 0.07 + 0.06 * grain + 0.045 * bh
                + broad1 * (0.62 + 0.28 * grain)
                + hot1 * 0.80
                + broad2 * 0.40
                + hot2 * 0.35;
      if (wall) lum *= 0.35;
      vec3 col = vec3(lum) * vec3(0.96, 0.975, 1.0);
      float fres = pow(1.0 - abs(dot(N, V)), 3.0);
      col += vec3(0.06, 0.065, 0.075) * fres;
      gl_FragColor = vec4(col, 1.0);
    }
  `
})

new SVGLoader().load("redo-logo.svg", data => {
  const shapes = []
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) shapes.push(shape)
  }
  const params = { depth: 130, curveSegments: 24, bevelEnabled: false }
  let geometry = mergeGeometries(
    shapes.map((shape, i) => {
      const g = new THREE.ExtrudeGeometry(shape, params)
      g.translate(0, 0, i * 3)
      return g
    })
  )
  geometry = mergeVertices(geometry, 0.4)
  geometry.computeVertexNormals()
  const s = LOGO_W / 1840.49
  geometry.scale(s, -s, s)
  geometry.computeBoundingBox()
  const c = new THREE.Vector3()
  geometry.boundingBox.getCenter(c)
  geometry.translate(-c.x, -c.y, -c.z)
  logoGroup.add(new THREE.Mesh(geometry, metalMaterial))
})

// -- sizing ---------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  const halfAngle = Math.atan(
    Math.tan((camera.fov * Math.PI) / 360) * camera.aspect
  )
  camera.position.z = (LOGO_W / 2 / 0.66) / Math.tan(halfAngle)
  camera.updateProjectionMatrix()
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
    energy = Math.min(energy + speed * 6, 1.4)
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
  energy *= Math.pow(0.25, dt)
  t += dt * (1 + energy * 1.2)
  uniforms.uTime.value = t
  uniforms.uAzi.value = mouseX * 2.4

  // barely any body motion: the mark stays the mark, the light does the work
  logoGroup.rotation.y = Math.sin(t * 0.3) * 0.10 + mouseX * 0.12
  logoGroup.rotation.x = Math.cos(t * 0.23) * 0.04 - mouseY * 0.09

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, logoGroup, uniforms, render }
