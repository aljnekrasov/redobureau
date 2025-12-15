import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"

var threedthings = function() {
  if (document.body.classList.contains("home")) {

    var logo, sphereCamera, stats, scene, renderer, camera, light, sky

    let height = window.innerHeight
    let width = window.innerWidth

    const container = document.getElementById("three_root")

    var windowHalfX = width / 2
    var windowHalfY = height / 2

    // const distance = 24
    const distance = 14
    const fov = 50
    let kX = (3.5 ** 2 * height) / (width * 1.5 * 4)
    let kY = (9 * height) / (width * 4)

    var mouseX = 0,
      mouseY = 0

    init()
    animate()

    function init() {
      scene = new THREE.Scene()

      camera = new THREE.PerspectiveCamera(fov, width / height, 0.1, 80)
      renderer = new THREE.WebGLRenderer({
        // alpha: true,
        // antialias: true,
        powerPreference: "high-performance"
      })
      // renderer.setClearColor(0x000000, 0)

      camera.position.z = (distance * height) / width
      // console.log(
      //   { fov },
      //   { width },
      //   { height },
      //   { kX },
      //   { kY },
      //   "Z",
      //   camera.position.z
      // )

      renderer.setSize(width, height)

      renderer.setPixelRatio(
        window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2) : 1
      )
      container.appendChild(renderer.domElement)

      window.renderer = renderer

      // stats = new Stats()
      // document.body.appendChild(stats.dom)

      light = new THREE.AmbientLight(0xffffff, 1)
      light.matrixAutoUpdate = false
      scene.add(light)

      const skyGeo = new THREE.SphereBufferGeometry(20, 25, 25)
      let loader = new THREE.TextureLoader()
      const texture = loader.load("assets/models/11.jpg")
      // texture.minFilter = THREE.LinearFilter

      const material = new THREE.MeshLambertMaterial({
        map: texture
      })

      sky = new THREE.Mesh(skyGeo, material)
      sky.material.side = THREE.BackSide
      scene.add(sky)

      // sky.matrixAutoUpdate = false
      // const name = "IMG_0381.jpg"

      // scene.background = new THREE.CubeTextureLoader()
      //   .setPath("assets/models/map14/")
      //   .load(["px.png", "nx.png", "py.png", "ny.png", "Tex_9.jpg", "nz.png"])
      // .load([name, name, name, name, name, name])
      // .load([name, name, name, name, name, name])
      // pos-x, neg-x, pos-y, neg-y, pos-z, neg-z

      window.addEventListener("resize", onWindowResize, false)
      container.addEventListener("mousemove", onDocumentMouseMove, false)
      container.addEventListener("touchmove", onDocumentTouch, {
        // passive: true
      })
      // container.addEventListener("touchend", onDocumentTouch, false)
      // container.addEventListener("touchstart", onDocumentTouch, false)
      window.addEventListener("resize", onWindowResize, false)
      // document
      //   .getElementById("three_root")
      //   .addEventListener("click", swapTextures, false)
      function onDocumentTouch(event) {
        event.preventDefault()
        const targetTouches = event.targetTouches[0]
        onDocumentMouseMove(targetTouches)
        // mouseX = (targetTouches.clientX - windowHalfX) * 0.015
        // mouseY = (targetTouches.clientY - windowHalfY) * 0.015
        // console.dir(event.targetTouches)
        // console.dir(event.changedTouches)
      }

      loader = new GLTFLoader()

      loader.load(
        "assets/models/13feb_two_sides.glb",
        function(gltf) {
          window.gltf = gltf
          const mesh = gltf.scenes[0].children[0]
          const geometry = mesh.geometry
          sphereCamera = new THREE.CubeCamera(1, 300, 150)
          sphereCamera.position.set(0, 0, -14)
          scene.add(sphereCamera)

          let sphereMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            // envMap: scene.background
            envMap: sphereCamera.renderTarget.texture,
            refractionRatio: 1
          })

          logo = new THREE.Mesh(geometry, sphereMaterial)
          logo.matrixAutoUpdate = false
          scene.add(logo)
        },
        undefined,
        function(error) {
          console.error(error)
        }
      )
    }
    // let name = "19_feb_1929.png"
    // function swapTextures() {
    //   name = name == "19_feb_1929.png" ? "19_feb_1930.png" : "19_feb_1929.png"
    //   scene.background = new THREE.CubeTextureLoader()
    //     .setPath("assets/models/")
    //     .load(["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"])
    //   // .load([name, name, name, name, name, name])
    // }
    function onWindowResize() {
      height = window.innerHeight
      width = window.innerWidth

      camera.position.z = (distance * height) / width

      windowHalfX = width / 2
      windowHalfY = height / 2

      kX = (3.5 ** 2 * height) / (width * 1.5 * 4)
      kY = (9 * height) / (width * 4)

      camera.aspect = width / height
      camera.updateProjectionMatrix()

      renderer.setSize(width, height)
    }

    function onDocumentMouseMove(event) {
      mouseX = (event.clientX - windowHalfX) * 0.015 * kX
      mouseY = (event.clientY - windowHalfY) * 0.015 * kY
    }

    function animate() {
      requestAnimationFrame(animate)
      render()
    }

    function render() {
      // const dX = mouseX - camera.position.x
      // const dY = mouseY + camera.position.y
      // console.log({ dX, dY })

      // if (dX != 0 || dY != 0) {
      camera.position.x += (mouseX - camera.position.x) * 0.05
      camera.position.y -= (mouseY + camera.position.y) * 0.05
      camera.lookAt(scene.position)
      if (sphereCamera) {
        // sky.visible = true 
        logo.visible = false
        sphereCamera.update(renderer, scene)
        logo.visible = true
        // sky.visible = false
      }
      // }

      renderer.render(scene, camera)
    }
  }
}

export default threedthings
