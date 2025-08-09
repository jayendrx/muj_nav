import * as  THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('canvas');

//Creating a scene
const scene = new THREE.Scene();

const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

//camera
const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);
camera.position.set(0, 5, 10);

//model
const loader = new GLTFLoader();
loader.load("/universityModel.glb", (gltf) => {
    const model = gltf.scene;
    model.position.set(0, -1, 0);
    scene.add(model);
})

//light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
const ambientLight = new THREE.AmbientLight(0xffffff, 3);
scene.add(ambientLight);
scene.add(directionalLight);

//orbit controls
const controls = new OrbitControls(camera, document.getElementById("canvas"));
controls.enableDamping = true;
controls.enablePan = true;
controls.enableZoom = true;

//renderer
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.clearColor(0xffffff, 1.0);

// resize
window.addEventListener("resize", () => {
  console.log("resizing");
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  controls.update();
});

function animate() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();