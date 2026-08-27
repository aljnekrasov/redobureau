import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Kapas: the mark embossed into a desert — the letters rise out of rolling dunes as landforms, a low sun raking long shadows across the sand.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xe8c9a0)
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)

function applySize() {
  width = window.innerWidth || width; height = window.innerHeight || height
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  const halfA = Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect)
  camera.position.z = (LOGO_W / 2 / 0.62) / Math.tan(halfA)
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

function loadMask(done) {
  fetch("redo-logo.svg").then(r => r.text()).then(svg => {
    const sized = svg.replace(/currentColor/g, "#fff")
      .replace("<svg ", '<svg width="1840.49" height="468.42" ')
    const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }))
    const img = new Image()
    img.onload = () => {
      const MW = 512, MH = 140
      const c = document.createElement("canvas"); c.width = MW; c.height = MH
      const g = c.getContext("2d")
      const s = Math.min((MW * 0.96) / img.width, (MH * 0.9) / img.height)
      const dw = img.width * s, dh = img.height * s
      g.drawImage(img, (MW - dw) / 2, (MH - dh) / 2, dw, dh)
      done(g.getImageData(0, 0, MW, MH).data, MW, MH, c)
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

let terrain = null
const uni = { uTime: { value: 0 }, uHeight: { value: null }, uSun: { value: new THREE.Vector3(1, 0.4, 0.5) } }
loadMask((data, MW, MH, srcCanvas) => {
  const b = document.createElement("canvas"); b.width = MW; b.height = MH
  const g = b.getContext("2d")
  g.filter = "blur(7px)"
  g.drawImage(srcCanvas, 0, 0)
  const tex = new THREE.CanvasTexture(b)
  uni.uHeight.value = tex
  const geo = new THREE.PlaneGeometry(12, 5.2, 240, 100)
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: `
      uniform sampler2D uHeight;
      uniform float uTime;
      varying float vH; varying vec2 vUv; varying vec3 vPos;
      void main() {
        vUv = uv;
        float logo = texture2D(uHeight, clamp((uv - 0.5) * vec2(1.35, 2.2) + 0.5, 0.0, 1.0)).a;
        float dune = 0.06 * sin(uv.x * 34.0 + sin(uv.y * 12.0) * 2.0)
                   + 0.08 * sin(uv.y * 22.0 + uv.x * 8.0)
                   + 0.03 * sin(uv.x * 70.0 + uTime * 0.1);
        float h = logo * 0.55 + dune * (0.25 + 0.75 * (1.0 - logo));
        vH = h;
        vec3 p = position + vec3(0.0, 0.0, h);
        vPos = p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      precision highp float;
      uniform vec3 uSun;
      varying float vH; varying vec2 vUv; varying vec3 vPos;
      void main() {
        vec3 dx = dFdx(vPos), dy = dFdy(vPos);
        vec3 n = normalize(cross(dx, dy));
        float li = max(dot(n, normalize(uSun)), 0.0);
        vec3 sandLow = vec3(0.72, 0.52, 0.34);
        vec3 sandHigh = vec3(0.96, 0.80, 0.58);
        vec3 col = mix(sandLow, sandHigh, vH * 1.3);
        col *= 0.35 + 0.8 * li;
        col += vec3(1.0, 0.75, 0.45) * pow(li, 6.0) * 0.25;
        gl_FragColor = vec4(col, 1.0);
      }`
  })
  mat.extensions = { derivatives: true }
  terrain = new THREE.Mesh(geo, mat)
  terrain.rotation.x = -0.72
  terrain.position.y = -0.35
  scene.add(terrain)
})
function tick(dt) {
  uni.uTime.value = t
  const a = 0.5 + Math.sin(t * 0.1) * 0.4
  uni.uSun.value.set(Math.cos(a) * 1.5, 0.35 + 0.2 * Math.sin(t * 0.07), Math.sin(a))
  if (terrain) {
    terrain.rotation.z = mouseX * 0.08 + Math.sin(t * 0.15) * 0.03
    terrain.rotation.x = -0.72 - mouseY * 0.06
  }
}

const clock = new THREE.Clock()
let t = 0
function render() {
  if (width !== window.innerWidth || height !== window.innerHeight) applySize()
  const dt = Math.min(clock.getDelta(), 0.05)
  t += dt
  energy *= Math.pow(0.5, dt)
  tick(dt)
  renderer.render(scene, camera)
}
function animate() { requestAnimationFrame(animate); render() }
animate()

window.__fable = { renderer, scene, camera, get t() { return t }, set t(v) { t = v }, render }
