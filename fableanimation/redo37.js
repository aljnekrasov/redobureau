import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"

// Fluids: the mark cast in living liquid. An abstract iridescent texture is
// baked procedurally (vivid dye blobs marbled by repeated sine-warp passes),
// then wrapped over the extruded logotype. The surface never rests: vertices
// breathe along their normals like jelly, the texture's UVs are domain-warped
// and cross-faded so the paint flows across the letters without smearing,
// and a fresnel rim keeps the glassy body. The same dye drifts dimly in the
// background. Cursor tilts the mark; stirring speeds the flow.

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
scene.background = new THREE.Color(0x07060a)
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)

// -- the "generated" abstract texture ---------------------------------------------------

function makeAbstractTexture() {
  const S = 1024
  const c = document.createElement("canvas"); c.width = c.height = S
  const g = c.getContext("2d")

  // deep ground
  const bg = g.createLinearGradient(0, 0, S, S)
  bg.addColorStop(0, "#12041f")
  bg.addColorStop(0.5, "#031024")
  bg.addColorStop(1, "#1c0210")
  g.fillStyle = bg
  g.fillRect(0, 0, S, S)

  // vivid dye blobs
  const PAL = ["#ff2f92", "#ff7a18", "#ffd41f", "#39ffc2", "#2f9dff", "#8f4dff", "#ff4d3a", "#aef52d"]
  for (let i = 0; i < 46; i++) {
    const x = Math.random() * S, y = Math.random() * S
    const r = 60 + Math.random() * 240
    const col = PAL[(Math.random() * PAL.length) | 0]
    const rg = g.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, col)
    rg.addColorStop(1, "rgba(0,0,0,0)")
    g.globalAlpha = 0.35 + Math.random() * 0.45
    g.globalCompositeOperation = Math.random() < 0.6 ? "lighter" : "source-over"
    g.fillStyle = rg
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
  }
  g.globalAlpha = 1
  g.globalCompositeOperation = "source-over"

  // marbling: slice rows/columns and shove them along sines, several passes
  const tmp = document.createElement("canvas"); tmp.width = tmp.height = S
  const tg = tmp.getContext("2d")
  for (let pass = 0; pass < 4; pass++) {
    tg.clearRect(0, 0, S, S)
    tg.drawImage(c, 0, 0)
    const amp = 40 + pass * 26
    const freq = 0.004 + pass * 0.003
    const ph = Math.random() * 6.28
    if (pass % 2 === 0) {
      for (let y = 0; y < S; y += 2) {
        const dx = Math.sin(y * freq + ph) * amp
        g.drawImage(tmp, 0, y, S, 2, dx, y, S, 2)
        g.drawImage(tmp, 0, y, S, 2, dx - S * Math.sign(dx), y, S, 2)
      }
    } else {
      for (let x = 0; x < S; x += 2) {
        const dy = Math.sin(x * freq + ph) * amp
        g.drawImage(tmp, x, 0, 2, S, x, dy, 2, S)
        g.drawImage(tmp, x, 0, 2, S, x, dy - S * Math.sign(dy), 2, S)
      }
    }
  }

  // gloss veins
  g.globalCompositeOperation = "lighter"
  g.lineWidth = 2
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(255,255,255,${(0.05 + Math.random() * 0.10).toFixed(3)})`
    g.beginPath()
    let x = Math.random() * S, y = Math.random() * S
    g.moveTo(x, y)
    for (let k = 0; k < 60; k++) {
      x += Math.sin(y * 0.013 + i) * 9
      y += 6
      g.lineTo(x, y)
    }
    g.stroke()
  }
  g.globalCompositeOperation = "source-over"

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.anisotropy = 4
  return t
}
const dyeTex = makeAbstractTexture()

// -- fluid logo material ----------------------------------------------------------------

const uniforms = {
  uTex: { value: dyeTex },
  uTime: { value: 0 },
  uAmp: { value: 0.05 },
  uFlow: { value: 1.0 },
  uBBox: { value: new THREE.Vector4(-LOGO_W / 2, -0.42, LOGO_W, 0.84) } // x, y, w, h — set after build
}

const fluidMat = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: /* glsl */ `
    uniform float uTime, uAmp;
    varying vec3 vN;
    varying vec3 vPos;
    varying vec3 vView;
    void main() {
      vec3 p = position;
      float t = uTime;
      // the jelly breath: normal-directed waves travelling across the mark
      float d = sin(p.x*2.3 + t*1.35) * 0.45
              + sin(p.y*3.6 - t*1.8) * 0.30
              + sin((p.x + p.y)*1.5 + t*0.75) * 0.25;
      p += normal * d * uAmp;
      // bend the normal with the wave gradient so light follows the wobble
      vec3 n = normal;
      n.x += 0.35 * cos(p.x*2.3 + t*1.35) * 2.3 * uAmp * 4.0;
      n.y += 0.35 * (-cos(p.y*3.6 - t*1.8)) * 3.6 * uAmp * 4.0;
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
    uniform float uTime, uFlow;
    uniform vec4 uBBox;
    varying vec3 vN;
    varying vec3 vPos;
    varying vec3 vView;

    void main() {
      vec2 uv = (vPos.xy - uBBox.xy) / uBBox.zw;

      // two counter-drifting domain warps, cross-faded — endless flow, no smear
      float t = uTime * 0.18 * uFlow;
      vec2 w1 = uv + 0.10*vec2(sin(uv.y*7.0 + t*3.1), cos(uv.x*6.0 - t*2.6)) + vec2(t*0.11, -t*0.07);
      vec2 w2 = uv + 0.10*vec2(sin(uv.y*5.0 - t*2.2 + 2.1), cos(uv.x*8.0 + t*2.9 + 4.2)) + vec2(-t*0.09, t*0.06);
      float k = 0.5 + 0.5*sin(t*4.0);
      vec3 dye = mix(texture2D(uTex, w1).rgb, texture2D(uTex, w2).rgb, k);

      vec3 n = normalize(vN);
      vec3 v = normalize(vView);
      if (dot(n, v) < 0.0) n = -n;

      // glassy body: dye + fresnel rim + moving specular
      float fres = pow(1.0 - max(dot(n, v), 0.0), 2.6);
      vec3 col = dye * (0.95 + 0.55*max(dot(n, vec3(0.35, 0.55, 0.75)), 0.0));
      col += dye * fres * 1.8;
      col += vec3(1.0) * fres * 0.35;
      vec3 l = normalize(vec3(0.5, 0.8, 0.6));
      vec3 h = normalize(l + v);
      col += vec3(1.0, 0.97, 0.92) * pow(max(dot(n, h), 0.0), 60.0) * 0.9;
      vec3 l2 = normalize(vec3(-0.6, -0.2, 0.7));
      col += dye * pow(max(dot(n, normalize(l2 + v)), 0.0), 24.0) * 0.6;

      gl_FragColor = vec4(col, 1.0);
    }
  `
})

// -- build the mark ----------------------------------------------------------------------

let logoGroup = null
new SVGLoader().load("redo-logo.svg", data => {
  const geos = []
  let i = 0
  for (const path of data.paths) {
    for (const shape of SVGLoader.createShapes(path)) {
      const g = new THREE.ExtrudeGeometry(shape, {
        depth: 130, curveSegments: 24, bevelEnabled: false
      })
      g.translate(0, 0, i * 3)   // stagger coplanar caps against z-fighting
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
  const cx = (bb.min.x + bb.max.x) / 2
  const cy = (bb.min.y + bb.max.y) / 2
  const cz = (bb.min.z + bb.max.z) / 2
  geo.translate(-cx, -cy, -cz)
  geo.computeBoundingBox()
  uniforms.uBBox.value.set(
    geo.boundingBox.min.x, geo.boundingBox.min.y,
    geo.boundingBox.max.x - geo.boundingBox.min.x,
    geo.boundingBox.max.y - geo.boundingBox.min.y
  )

  logoGroup = new THREE.Mesh(geo, fluidMat)
  scene.add(logoGroup)
})

// -- the same dye, dim, drifting behind --------------------------------------------------

const bgMat = new THREE.MeshBasicMaterial({ map: dyeTex.clone(), transparent: true, opacity: 0.16, depthWrite: false })
bgMat.map.wrapS = bgMat.map.wrapT = THREE.RepeatWrapping
bgMat.map.repeat.set(1.6, 1.6)
const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), bgMat)
bgQuad.position.z = -6
scene.add(bgQuad)

// -- sizing / input -----------------------------------------------------------------------

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

// -- loop ---------------------------------------------------------------------------------

const clock = new THREE.Clock()
let t = 0

function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()
  const dt = Math.min(clock.getDelta(), 0.05)
  t += dt
  energy *= Math.pow(0.5, dt)

  uniforms.uTime.value = t
  uniforms.uFlow.value = 1.0 + energy * 2.2
  uniforms.uAmp.value = 0.045 + energy * 0.03

  if (logoGroup) {
    logoGroup.rotation.y = Math.sin(t * 0.4) * 0.22 + mouseX * 0.35
    logoGroup.rotation.x = Math.sin(t * 0.31) * 0.10 - mouseY * 0.22
  }
  bgMat.map.offset.set(t * 0.008, -t * 0.005)

  renderer.render(scene, camera)
}
function animate() { requestAnimationFrame(animate); render() }
animate()

window.__fable = { renderer, scene, camera, get t() { return t }, set t(v) { t = v }, render }
