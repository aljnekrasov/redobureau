import * as THREE from "three"
import { SVGLoader } from "three/addons/loaders/SVGLoader.js"
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js"


// Kaleidoskops: the mark dropped into a kaleidoscope — six mirrored sectors fold the letters into a turning mandala, hue cycling as the barrel rotates.

const LOGO_W = 3.2
let width = window.innerWidth || 1280
let height = window.innerHeight || 720
let mouseX = 0, mouseY = 0, energy = 0, lastX = null, lastY = null

const canvas = document.getElementById("scene_root")
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
// dpr locked to 1 — embedded preview compositors blit canvas bitmaps 1:1
renderer.setPixelRatio(1)
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0a0610)
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300)

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

let quad = null
const uni = { uTime: { value: 0 }, uMask: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(0, 0) } }
loadMask((data, MW, MH, srcCanvas) => {
  const tex = new THREE.CanvasTexture(srcCanvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  uni.uMask.value = tex
  const mat = new THREE.ShaderMaterial({
    uniforms: uni,
    vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform sampler2D uMask;
      uniform vec2 uRes;
      uniform vec2 uMouse;
      vec3 hsl2rgb(vec3 c) {
        vec3 rgb = clamp(abs(mod(c.x*6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0*c.z - 1.0));
      }
      void main() {
        vec2 q = (2.0 * gl_FragCoord.xy - uRes) / uRes.y;
        float r = length(q);
        float a = atan(q.y, q.x) + uTime * 0.12 + uMouse.x * 0.5;
        // шесть зеркальных секторов
        float SEC = 6.2831 / 6.0;
        a = mod(a, SEC);
        a = abs(a - SEC * 0.5);
        vec2 p = vec2(cos(a), sin(a)) * r;
        // выборка знака с дрейфом и зумом
        float zoom = 1.15 + 0.25 * sin(uTime * 0.2);
        vec2 uv = p * zoom * vec2(0.55, 1.6) + vec2(0.5 + uTime * 0.02, 0.5 + uMouse.y * 0.2);
        float m = texture2D(uMask, fract(uv)).a;
        float m2 = texture2D(uMask, fract(uv * 1.6 + 0.3)).a;
        float hue = fract(uTime * 0.04 + r * 0.35);
        vec3 col = hsl2rgb(vec3(hue, 0.75, 0.16)) * (1.0 - m) * (1.0 - m2 * 0.5);
        col += hsl2rgb(vec3(fract(hue + 0.45), 0.85, 0.6)) * m;
        col += hsl2rgb(vec3(fract(hue + 0.18), 0.9, 0.5)) * m2 * (1.0 - m) * 0.7;
        col *= smoothstep(1.6, 0.5, r) * 0.9 + 0.1;
        gl_FragColor = vec4(col, 1.0);
      }`
  })
  quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
  quad.frustumCulled = false
  scene.add(quad)
})
function tick(dt) {
  uni.uTime.value = t
  uni.uRes.value.set(width, height)
  uni.uMouse.value.set(mouseX, mouseY)
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
