import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"

// Liquid Redo: the redo logotype extruded into 3d and rendered as a stack of
// translucent onion shells — every shell inflates along the normals a bit
// further and glows at grazing angles, so the silhouette reads as dozens of
// fine contour lines, the way layered ruffle renders do. The liquid motion
// is the same simplex morph that drives Liquid 001, applied in the vertex
// shader so all shells breathe through one shared field.

const SHELLS = 30
// total inflation must stay under the logo's tightest gaps (~0.35 world),
// otherwise shells from neighbouring strokes interpenetrate and bloom out
const SHELL_STEP = 0.009
const LOGO_WIDTH = 9 // world units the logotype is scaled to
const EXTRUDE_DEPTH = 130 // svg units, scaled together with the outline

const TEAL = new THREE.Color("#7ca493")
const STEEL = new THREE.Color("#7fa0c6")
const CORAL = new THREE.Color("#ff8a5f")

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
scene.background = new THREE.Color("#060808")

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120)

const renderer = new THREE.WebGLRenderer({
  canvas,
  powerPreference: "high-performance",
  antialias: true
})
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
// without scaling them into the css box, a retina bitmap shows as a crop
renderer.setPixelRatio(1)

// -- shell shader ---------------------------------------------------------------

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
  uniform float uTime;
  uniform float uShell;
  uniform float uAmp;
  varying vec3 vN;
  varying vec3 vV;
  varying float vNoise;
  ${NOISE_GLSL}
  void main() {
    vec3 n = normalize(normal);
    float t = uTime;
    // one shared liquid field for every shell — big slow folds plus a
    // finer counter-current, like the blob in Liquid 001
    float d =
      0.7 * snoise(vec3(position.xy * 0.30, position.z * 0.28) + vec3(t * 0.16, 0.0, t * 0.11)) +
      0.3 * snoise(vec3(position.xy * 0.85, t * 0.20) - vec3(t * 0.13, 0.0, 0.0));
    vec3 p = position
      + n * (d * uAmp)
      + n * (uShell * (1.0 + 0.45 * d)); // ruffles fan out where the field pushes
    vNoise = d;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalMatrix * n;
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

// shells: nearly invisible face-on, a thin bright line edge-on — stacked
// rims read as the fine contour striations of the reference
const fragmentShader = /* glsl */ `
  uniform vec3 uTeal;
  uniform vec3 uSteel;
  uniform vec3 uCoral;
  uniform float uShellF;
  varying vec3 vN;
  varying vec3 vV;
  varying float vNoise;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(vV);
    float fres = pow(1.0 - abs(dot(N, V)), 3.2);
    vec3 base = mix(uTeal, uSteel, smoothstep(-0.2, 1.0, vNoise));
    vec3 col = base * fres * 1.0;
    col += uCoral * smoothstep(0.2, 0.9, vNoise) * fres * (0.5 + 0.8 * uShellF);
    float a = 0.005 + fres * 0.2;
    gl_FragColor = vec4(col, a);
  }
`

// flat near-black caps: the letter faces stay solid so the stack keeps a
// dark silhouette, while all the light lives on the ribbon walls
const capFragmentShader = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying float vNoise;
  void main() {
    gl_FragColor = vec4(0.030, 0.045, 0.040, 1.0);
  }
`

// the core: the logotype body itself — dark, softly shaded, opaque, so the
// stack has a solid silhouette under the glowing contours
const coreFragmentShader = /* glsl */ `
  uniform vec3 uTeal;
  uniform vec3 uSteel;
  uniform vec3 uCoral;
  varying vec3 vN;
  varying vec3 vV;
  varying float vNoise;
  void main() {
    vec3 N = normalize(vN);
    vec3 V = normalize(vV);
    float fres = pow(1.0 - abs(dot(N, V)), 2.0);
    vec3 base = mix(uTeal, uSteel, smoothstep(-0.2, 1.0, vNoise));
    vec3 col = base * (0.16 + 0.5 * fres);
    col += uCoral * smoothstep(0.2, 0.9, vNoise) * (0.15 + fres * 0.6);
    gl_FragColor = vec4(col, 1.0);
  }
`

// -- logo geometry ----------------------------------------------------------------

const group = new THREE.Group()
scene.add(group)

const shellMaterials = []

new SVGLoader().load("redo-logo.svg", data => {
  const shapes = []
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) shapes.push(shape)
  }

  // no bevel: the logo outline touches itself in places and beveling those
  // joints spits out flipped shards — the shells soften the edges instead
  let geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: EXTRUDE_DEPTH,
    curveSegments: 20,
    bevelEnabled: false
  })

  // tolerance well below the logo's smallest arc segments (~1 svg unit) —
  // anything coarser welds them together and spits out flipped shards
  geometry = mergeVertices(geometry, 0.4)
  geometry.computeVertexNormals()

  // svg space is y-down and lives around (1000, 1000) — flip, scale to
  // world units and center on the origin
  const s = LOGO_WIDTH / 1840.49
  geometry.scale(s, -s, s)
  geometry.computeBoundingBox()
  const c = new THREE.Vector3()
  geometry.boundingBox.getCenter(c)
  geometry.translate(-c.x, -c.y, -c.z)

  // extrude group 0 = front/back caps, group 1 = side walls. the caps of
  // this logo triangulate badly (self-touching outline) — so the shells
  // skip them entirely and only the core draws them, flat and near-black
  const caps = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: capFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0.16 },
      uShell: { value: 0 }
    }
  })
  const hiddenCaps = new THREE.MeshBasicMaterial({ visible: false })

  const core = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: coreFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0.16 },
      uShell: { value: 0 },
      uTeal: { value: TEAL },
      uSteel: { value: STEEL },
      uCoral: { value: CORAL }
    }
  })
  // caps hidden here too: the overlapping outlines of the logotype produce
  // coincident cap planes that z-fight as dark shards — walls-only turns
  // the letters into hollow ribbons, which is the reference look anyway
  shellMaterials.push(core, caps)
  const coreMesh = new THREE.Mesh(geometry, [hiddenCaps, core])
  coreMesh.renderOrder = 0
  group.add(coreMesh)

  for (let i = 0; i < SHELLS; i++) {
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0.16 },
        uShell: { value: (i + 1) * SHELL_STEP },
        uShellF: { value: i / (SHELLS - 1) },
        uTeal: { value: TEAL },
        uSteel: { value: STEEL },
        uCoral: { value: CORAL }
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })
    shellMaterials.push(material)
    const mesh = new THREE.Mesh(geometry, [hiddenCaps, material])
    mesh.renderOrder = i + 1
    group.add(mesh)
  }
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
  // fit the logotype's width into ~78% of the frame
  const halfAngle = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_WIDTH / 2 / 0.78) / Math.tan(halfAngle)
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
  mouseX = ((event.clientX - windowHalfX) / windowHalfX) * 2.2
  mouseY = ((event.clientY - windowHalfY) / windowHalfY) * 1.4

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
  morphTime += dt * (0.55 + energy * 1.3)

  const amp = 0.16 + energy * 0.18
  for (const material of shellMaterials) {
    material.uniforms.uTime.value = morphTime
    material.uniforms.uAmp.value = amp
  }

  // slow breathing sway instead of a spin — the form hangs in the dark
  group.rotation.y = Math.sin(morphTime * 0.14) * 0.34 + mouseX * 0.12
  group.rotation.x = Math.cos(morphTime * 0.11) * 0.18 - mouseY * 0.1

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

window.__fable = { renderer, scene, camera, group, shellMaterials, render }
