import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"

// Lidmasina: a Nano Banana photograph — a vintage silver airliner over a
// sea of sunset clouds — screened through the letters of the mark. The
// photo is billboard-mapped across the whole logotype without distortion
// (cover fit), and a slow Ken Burns drift pans and breathes inside the
// letterforms, so the plane crosses the word while the black around it
// stays empty. A faint jelly wave keeps the extrusion alive; fresnel rim
// and a moving specular give the glass. Cursor tilts the mark and nudges
// the framing.

const LOGO_W = 3.2

let width = window.innerWidth || 1280
let height = window.innerHeight || 720

let mouseX = 0, mouseY = 0
let energy = 0
let lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x000000)
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)

// -- the Nano Banana photo -----------------------------------------------------------------

let photoAspect = 16 / 9
const photoTex = new THREE.TextureLoader().load("nano-plane.png", t => {
  photoAspect = t.image.width / t.image.height
  fitPhoto()
})
photoTex.colorSpace = THREE.SRGBColorSpace
photoTex.wrapS = photoTex.wrapT = THREE.ClampToEdgeWrapping
photoTex.anisotropy = 4

// -- material --------------------------------------------------------------------------------

const uniforms = {
  uTex: { value: photoTex },
  uTime: { value: 0 },
  uAmp: { value: 0.022 },
  uBBox: { value: new THREE.Vector4(-LOGO_W / 2, -0.42, LOGO_W, 0.84) },
  uFit: { value: new THREE.Vector2(1, 1) },   // uv scale for undistorted cover fit
  uPan: { value: new THREE.Vector2(0, 0) }
}

function fitPhoto() {
  // cover: keep photo proportions, window slides inside it
  const bb = uniforms.uBBox.value
  const bboxAspect = bb.z / bb.w
  const zoom = 0.92                      // how much of the photo height the letters see
  let su = (bboxAspect / photoAspect) * zoom
  let sv = zoom
  if (su > 1) { sv /= su; su = 1 * zoom }  // never sample outside horizontally
  uniforms.uFit.value.set(su, sv)
}

const mat = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: /* glsl */ `
    uniform float uTime, uAmp;
    varying vec3 vN;
    varying vec3 vPos;
    varying vec3 vView;
    void main() {
      vec3 p = position;
      float t = uTime;
      float d = sin(p.x*2.2 + t*1.1) * 0.5
              + sin(p.y*3.1 - t*1.5) * 0.3;
      p += normal * d * uAmp;
      vec3 n = normal;
      n.x += cos(p.x*2.2 + t*1.1) * uAmp * 2.5;
      n.y += -cos(p.y*3.1 - t*1.5) * uAmp * 3.0;
      vN = normalize(normalMatrix * normalize(n));
      vec4 wp = modelMatrix * vec4(p, 1.0);
      vPos = position;
      vView = normalize(cameraPosition - wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D uTex;
    uniform float uTime;
    uniform vec4 uBBox;
    uniform vec2 uFit;
    uniform vec2 uPan;
    varying vec3 vN;
    varying vec3 vPos;
    varying vec3 vView;
    void main() {
      vec2 uv01 = (vPos.xy - uBBox.xy) / uBBox.zw;
      // Ken Burns: the window drifts and breathes inside the photo
      float t = uTime;
      float zoom = 1.0 + 0.05*sin(t*0.12);
      vec2 span = uFit / zoom;
      vec2 base = vec2(0.5, 0.52) + uPan
                + 0.045*vec2(sin(t*0.07), 0.6*sin(t*0.09 + 1.7));
      vec2 lo = clamp(base - span*0.5, vec2(0.0), vec2(1.0) - span);
      vec2 uv = lo + uv01 * span;
      vec3 photo = texture2D(uTex, uv).rgb;

      vec3 n = normalize(vN);
      vec3 v = normalize(vView);
      if (dot(n, v) < 0.0) n = -n;

      float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
      vec3 col = photo * (1.06 + 0.25*max(dot(n, vec3(0.3, 0.5, 0.8)), 0.0));
      col += photo * fres * 1.2;
      col += vec3(1.0, 0.92, 0.8) * fres * 0.22;
      vec3 l = normalize(vec3(0.5, 0.75, 0.6));
      vec3 h = normalize(l + v);
      col += vec3(1.0, 0.96, 0.88) * pow(max(dot(n, h), 0.0), 80.0) * 0.7;

      gl_FragColor = vec4(col, 1.0);
    }
  `
})

// -- build the mark ---------------------------------------------------------------------------

let logoGroup = null
new SVGLoader().load("redo-logo.svg", data => {
  const geos = []
  let i = 0
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) {
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: 130, curveSegments: 24, bevelEnabled: false
      })
      g.translate(0, 0, i * 3)
      i++
      geos.push(g)
    }
  }
  let geo = BufferGeometryUtils.mergeGeometries(geos)
  geo = BufferGeometryUtils.mergeVertices(geo, 0.4)
  geo.computeVertexNormals()

  const s = LOGO_W / 1840.49
  geo.scale(s, -s, s)
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2)
  geo.computeBoundingBox()
  uniforms.uBBox.value.set(
    geo.boundingBox.min.x, geo.boundingBox.min.y,
    geo.boundingBox.max.x - geo.boundingBox.min.x,
    geo.boundingBox.max.y - geo.boundingBox.min.y
  )
  fitPhoto()

  logoGroup = new THREE.Mesh(geo, mat)
  scene.add(logoGroup)
})

// -- sizing / input -----------------------------------------------------------------------------

function applySize() {
  width = window.innerWidth || width; height = window.innerHeight || height
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  const halfA = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_W / 2 / 0.78) / Math.tan(halfA)
  camera.updateProjectionMatrix()
}
applySize()
window.addEventListener("resize", applySize)

window.addEventListener("mousemove", e => {
  mouseX = (e.clientX / width - 0.5) * 2
  mouseY = (e.clientY / height - 0.5) * 2
  if (lastX !== null) energy = Math.min(energy + Math.hypot(e.clientX - lastX, e.clientY - lastY) / Math.max(width, height) * 5, 1.6)
  lastX = e.clientX; lastY = e.clientY
})

// -- loop ----------------------------------------------------------------------------------------

const clock = new THREE.Clock()
let t = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()
  const dt = Math.min(clock.getDelta(), 0.05)
  t += dt
  energy *= Math.pow(0.5, dt)

  uniforms.uTime.value = t
  uniforms.uAmp.value = 0.02 + energy * 0.02
  uniforms.uPan.value.set(mouseX * 0.03, -mouseY * 0.02)

  if (logoGroup) {
    logoGroup.rotation.y = Math.sin(t * 0.3) * 0.18 + mouseX * 0.3
    logoGroup.rotation.x = Math.sin(t * 0.24) * 0.08 - mouseY * 0.18
  }

  renderer.render(scene, camera)
}
function animate() { requestAnimationFrame(animate); render() }
animate()

window.__fable = { renderer, scene, camera, get t() { return t }, set t(v) { t = v }, render }
