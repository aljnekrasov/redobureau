import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"

// Lentes: the redo logotype as a tangle of flat white ribbons on black,
// after the poster reference. Every outline of the logo becomes one closed
// band that mostly lies flat in the picture plane, rolls onto its edge in
// travelling twists, and drifts in depth so the loops overlap — matte white,
// soft gray shading, hard silhouette.

const LOGO_WIDTH = 9 // world units the logotype is scaled to
const RIBBON_W = 0.46 // band width in world units
const POINTS = 260 // resampled points per contour
const MIN_LOOP = 3 // world units — drop loops shorter than this (the dots)

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

const scene = new THREE.Scene()
scene.background = new THREE.Color("#0a0a0c")

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120)

const renderer = new THREE.WebGLRenderer({
  canvas,
  powerPreference: "high-performance",
  antialias: true
})
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
// without scaling them into the css box, a retina bitmap shows as a crop
renderer.setPixelRatio(1)

// -- ribbon shader ---------------------------------------------------------------

const NOISE_GLSL = /* glsl */ `
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`

const vertexShader = /* glsl */ `
  attribute vec2 aTan;
  attribute float aS;
  attribute float aSide;
  uniform float uTime;
  uniform float uSeed;
  uniform float uHalfW;
  uniform float uEnergy;
  varying vec3 vNormal;
  varying float vTwist;
  ${NOISE_GLSL}
  void main() {
    float s = aS;
    float t = uTime;

    // travelling roll: the band lies flat, then turns onto its edge and
    // back as the twist wave passes through, plus a slow noisy wobble
    float theta =
      1.05 * sin(6.28318 * (s * 2.0 - t * 0.05) + uSeed * 7.0) +
      (0.5 + uEnergy * 0.4) * snoise(vec3(s * 4.0, t * 0.14, uSeed * 3.1));

    vec3 T = normalize(vec3(aTan, 0.0));
    vec3 N2 = normalize(vec3(aTan.y, -aTan.x, 0.0)); // in-plane normal
    vec3 B = vec3(0.0, 0.0, 1.0);
    vec3 D = cos(theta) * N2 + sin(theta) * B;

    // the loop itself drifts in depth so the tangle overlaps
    float z = 1.15 * snoise(vec3(position.xy * 0.20, t * 0.09 + uSeed * 5.3));
    vec3 base = vec3(position.xy, z);

    vec3 p = base + D * (aSide * uHalfW);
    vNormal = normalMatrix * normalize(cross(T, D));
    vTwist = sin(theta);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vNormal;
  varying float vTwist;
  void main() {
    vec3 N = normalize(vNormal);
    // matte paper white: bright face-on, cool gray when rolling away
    float l = abs(dot(N, normalize(vec3(0.22, 0.34, 0.92))));
    float shade = 0.52 + 0.48 * l;
    shade *= 1.0 - 0.12 * abs(vTwist);
    gl_FragColor = vec4(vec3(0.955, 0.955, 0.935) * shade, 1.0);
  }
`

// -- ribbons from the logo outlines -------------------------------------------------

const group = new THREE.Group()
scene.add(group)

const materials = []

function resample(points, count) {
  // uniform arclength resampling of a closed contour
  const lens = [0]
  let total = 0
  for (let i = 1; i <= points.length; i++) {
    total += points[i % points.length].distanceTo(points[i - 1])
    lens.push(total)
  }
  const out = []
  let seg = 0
  for (let k = 0; k < count; k++) {
    const d = (k / count) * total
    while (seg < points.length && lens[seg + 1] < d) seg++
    const a = points[seg % points.length]
    const b = points[(seg + 1) % points.length]
    const f = (d - lens[seg]) / (lens[seg + 1] - lens[seg] || 1)
    out.push(new THREE.Vector2().lerpVectors(a, b, f))
  }
  return { points: out, length: total }
}

function makeRibbon(contour, seed, widthScale) {
  const { points } = contour
  const n = points.length
  const pos = new Float32Array(n * 2 * 3)
  const tan = new Float32Array(n * 2 * 2)
  const sArr = new Float32Array(n * 2)
  const side = new Float32Array(n * 2)
  const index = []

  for (let i = 0; i < n; i++) {
    const p = points[i]
    const prev = points[(i - 1 + n) % n]
    const next = points[(i + 1) % n]
    const tx = next.x - prev.x
    const ty = next.y - prev.y
    const tl = Math.hypot(tx, ty) || 1
    for (let k = 0; k < 2; k++) {
      const v = i * 2 + k
      pos[v * 3] = p.x
      pos[v * 3 + 1] = p.y
      pos[v * 3 + 2] = 0
      tan[v * 2] = tx / tl
      tan[v * 2 + 1] = ty / tl
      sArr[v] = i / n
      side[v] = k === 0 ? -1 : 1
    }
    const a = i * 2
    const b = i * 2 + 1
    const c = ((i + 1) % n) * 2
    const d = ((i + 1) % n) * 2 + 1
    index.push(a, b, c, b, d, c)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  geometry.setAttribute("aTan", new THREE.BufferAttribute(tan, 2))
  geometry.setAttribute("aS", new THREE.BufferAttribute(sArr, 1))
  geometry.setAttribute("aSide", new THREE.BufferAttribute(side, 1))
  geometry.setIndex(index)

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uHalfW: { value: (RIBBON_W * widthScale) / 2 },
      uEnergy: { value: 0 }
    },
    side: THREE.DoubleSide
  })
  materials.push(material)

  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  return mesh
}

new SVGLoader().load("redo-logo.svg", data => {
  const s = LOGO_WIDTH / 1840.49
  // svg y grows downward and the artwork sits around (1000, 1000)
  const cx = 79.6 + 1840.49 / 2
  const cy = 765.86 + 468.42 / 2

  const contours = []
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) {
      const ex = shape.extractPoints(24)
      for (const ring of [ex.shape, ...ex.holes]) {
        const world = ring.map(
          p => new THREE.Vector2((p.x - cx) * s, -(p.y - cy) * s)
        )
        const rs = resample(world, POINTS)
        if (rs.length >= MIN_LOOP) contours.push(rs)
      }
    }
  }

  contours.forEach((contour, i) => {
    const widthScale = 0.85 + ((i * 37) % 10) * 0.045
    group.add(makeRibbon(contour, i * 0.73 + 1, widthScale))
  })
})

// -- sizing -------------------------------------------------------------------------

function applySize() {
  if (window.innerWidth && window.innerHeight) {
    width = window.innerWidth
    height = window.innerHeight
  }
  windowHalfX = width / 2
  windowHalfY = height / 2

  camera.aspect = width / height
  const halfAngle = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_WIDTH / 2 / 0.8) / Math.tan(halfAngle)
  camera.updateProjectionMatrix()

  renderer.setSize(width, height, false)
}

applySize()
window.addEventListener("resize", applySize, false)

// -- interaction -----------------------------------------------------------------

canvas.addEventListener("mousemove", onPointerMove, false)
canvas.addEventListener("touchmove", e => {
  e.preventDefault()
  onPointerMove(e.targetTouches[0])
}, { passive: false })

function onPointerMove(event) {
  mouseX = ((event.clientX - windowHalfX) / windowHalfX) * 1.6
  mouseY = ((event.clientY - windowHalfY) / windowHalfY) * 1.0

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
let morphTime = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()

  const dt = Math.min(clock.getDelta(), 0.05)
  energy *= Math.pow(0.25, dt)
  morphTime += dt * (0.55 + energy * 1.1)

  for (const material of materials) {
    material.uniforms.uTime.value = morphTime
    material.uniforms.uEnergy.value = energy
  }

  group.rotation.y = Math.sin(morphTime * 0.12) * 0.1 + mouseX * 0.05
  group.rotation.x = Math.cos(morphTime * 0.1) * 0.05 - mouseY * 0.04

  camera.position.x += (mouseX - camera.position.x) * 0.05
  camera.position.y += (-mouseY - camera.position.y) * 0.05
  camera.lookAt(scene.position)

  renderer.render(scene, camera)
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

animate()

window.__fable = { renderer, scene, camera, group, materials, render }
