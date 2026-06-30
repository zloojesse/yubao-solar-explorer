import * as THREE from 'three';
import * as dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

import bgTexture1 from '/images/1.jpg';
import bgTexture2 from '/images/2.jpg';
import bgTexture3 from '/images/3.jpg';
import bgTexture4 from '/images/4.jpg';
import sunTexture from '/images/sun.jpg';
import mercuryTexture from '/images/mercurymap.jpg';
import mercuryBump from '/images/mercurybump.jpg';
import venusTexture from '/images/venusmap.jpg';
import venusBump from '/images/venusmap.jpg';
import venusAtmosphere from '/images/venus_atmosphere.jpg';
import earthTexture from '/images/earth_daymap.jpg';
import earthNightTexture from '/images/earth_nightmap.jpg';
import earthAtmosphere from '/images/earth_atmosphere.jpg';
import earthMoonTexture from '/images/moonmap.jpg';
import earthMoonBump from '/images/moonbump.jpg';
import marsTexture from '/images/marsmap.jpg';
import marsBump from '/images/marsbump.jpg';
import jupiterTexture from '/images/jupiter.jpg';
import ioTexture from '/images/jupiterIo.jpg';
import europaTexture from '/images/jupiterEuropa.jpg';
import ganymedeTexture from '/images/jupiterGanymede.jpg';
import callistoTexture from '/images/jupiterCallisto.jpg';
import saturnTexture from '/images/saturnmap.jpg';
import satRingTexture from '/images/saturn_ring.png';
import uranusTexture from '/images/uranus.jpg';
import uraRingTexture from '/images/uranus_ring.png';
import neptuneTexture from '/images/neptune.jpg';
import plutoTexture from '/images/plutomap.jpg';
import asteroidPackUrl from './asteroids/asteroidPack.glb?url';
import phobosModelUrl from './images/mars/phobos.glb?url';
import deimosModelUrl from './images/mars/deimos.glb?url';

// ******  SETUP  ******
window.addEventListener('DOMContentLoaded', () => renderTrivia('Earth'));

console.log("Create the scene");
const scene = new THREE.Scene();

console.log("Create a perspective projection camera");
var camera = new THREE.PerspectiveCamera( 50, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.set(-175, 115, 5);

console.log("Create the renderer");
const renderer = new THREE.WebGL1Renderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

console.log("Create an orbit control");
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.75;
controls.screenSpacePanning = false;

console.log("Set up texture loader");
const cubeTextureLoader = new THREE.CubeTextureLoader();
const loadTexture = new THREE.TextureLoader();

// ******  POSTPROCESSING setup ******
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// ******  OUTLINE PASS  ******
const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera);
outlinePass.edgeStrength = 3;
outlinePass.edgeGlow = 1;
outlinePass.visibleEdgeColor.set(0xffffff);
outlinePass.hiddenEdgeColor.set(0x190a05);
composer.addPass(outlinePass);

// ******  BLOOM PASS  ******
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1, 0.4, 0.85);
bloomPass.threshold = 1;
bloomPass.radius = 0.9;
composer.addPass(bloomPass);

// ****** AMBIENT LIGHT ******
console.log("Add the ambient light");
var lightAmbient = new THREE.AmbientLight(0x222222, 6); 
scene.add(lightAmbient);

// ******  Star background  ******
scene.background = cubeTextureLoader.load([

  bgTexture3,
  bgTexture1,
  bgTexture2,
  bgTexture2,
  bgTexture4,
  bgTexture2
]);

// ******  CONTROLS  ******
const gui = new dat.GUI({ autoPlace: false, width: 230 });
const customContainer = document.getElementById('gui-container');
customContainer.appendChild(gui.domElement);

function localizeGuiCloseButton() {
  const closeButton = gui.domElement.querySelector('.close-button');
  if (closeButton) closeButton.textContent = gui.closed ? '開啟控制' : '收合控制';
}

// ****** SETTINGS FOR INTERACTIVE CONTROLS  ******
const settings = {
  accelerationOrbit: 1,
  acceleration: 1,
  sunIntensity: 1.9
};

gui.add(settings, 'accelerationOrbit', 0, 10).name('行星公轉速度').onChange(value => {
});
gui.add(settings, 'acceleration', 0, 10).name('星球自轉速度').onChange(value => {
});
gui.add(settings, 'sunIntensity', 1, 10).name('太陽亮度').onChange(value => {
  sunMat.emissiveIntensity = value;
});
localizeGuiCloseButton();
gui.domElement.addEventListener('click', () => setTimeout(localizeGuiCloseButton, 0));

// mouse movement
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove(event) {
    event.preventDefault();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

// ******  SELECT PLANET  ******
let selectedPlanet = null;
let celestialMap = {};
const selectableOffsets = { Mercury: 10, Venus: 25, Earth: 25, Mars: 15, Ceres: 12, Jupiter: 50, Saturn: 50, Uranus: 25, Neptune: 20, Pluto: 10, Haumea: 12, Makemake: 12, Eris: 12, CometHalley: 16 };
const animatedSmallBodies = [];
let isMovingTowardsPlanet = false;
let focusFallbackTimer = null;
let targetCameraPosition = new THREE.Vector3();
let offset;

function onDocumentMouseDown(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  var intersects = raycaster.intersectObjects(raycastTargets);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    selectedPlanet = identifyPlanet(clickedObject);
    if (selectedPlanet) {
      closeInfoNoZoomOut();
      
      settings.accelerationOrbit = 0; // Stop orbital movement

      // Update camera to look at the selected planet
      const planetPosition = new THREE.Vector3();
      selectedPlanet.planet.getWorldPosition(planetPosition);
      controls.target.copy(planetPosition);
      camera.lookAt(planetPosition); // Orient the camera towards the planet

      targetCameraPosition.copy(planetPosition).add(camera.position.clone().sub(planetPosition).normalize().multiplyScalar(offset));
      isMovingTowardsPlanet = true;
    }
  }
}

function identifyPlanet(clickedObject) {
  // Logic to identify which planet was clicked based on the clicked object, different offset for camera distance
        if (clickedObject.material === mercury.planet.material) {
          offset = 10;
          return mercury;
        } else if (clickedObject.material === venus.Atmosphere.material) {
          offset = 25;
          return venus;
        } else if (clickedObject.material === earth.Atmosphere.material) {
          offset = 25;
          return earth;
        } else if (clickedObject.material === mars.planet.material) {
          offset = 15;
          return mars;
        } else if (clickedObject.material === jupiter.planet.material) {
          offset = 50;
          return jupiter;
        } else if (clickedObject.material === saturn.planet.material) {
          offset = 50;
          return saturn;
        } else if (clickedObject.material === uranus.planet.material) {
          offset = 25;
          return uranus;
        } else if (clickedObject.material === neptune.planet.material) {
          offset = 20;
          return neptune;
        } else if (clickedObject.material === pluto.planet.material) {
          offset = 10;
          return pluto;
        }

  for (const body of Object.values(celestialMap)) {
    if (clickedObject === body.planet || clickedObject.material === body.planet.material) {
      offset = selectableOffsets[body.name] || 18;
      return body;
    }
  }

  return null;
}


const zhNameMap = {
  Mercury: '水星', Venus: '金星', Earth: '地球', Mars: '火星', Ceres: '穀神星', Jupiter: '木星',
  Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星',
  Haumea: '妊神星', Makemake: '鳥神星', Eris: '鬩神星', CometHalley: '哈雷彗星'
};

const planetTrivia = {
  Mercury: [
    { q: '水星離太陽最近，它是不是太陽系最熱的行星？', a: '不是喔！最熱的是金星，因為金星有很厚的大氣把熱留住。' },
    { q: '水星有自己的衛星嗎？', a: '沒有，水星沒有衛星。' }
  ],
  Venus: [
    { q: '金星為什麼像包著厚棉被？', a: '因為它有非常厚的大氣，會把熱困在星球表面。' },
    { q: '金星自轉快還是公轉快？', a: '很特別：金星自轉一圈比繞太陽一圈還久。' }
  ],
  Earth: [
    { q: '為什麼地球會有白天和黑夜？', a: '因為地球會自轉，面向太陽的一邊是白天，背對太陽的一邊是夜晚。' },
    { q: '地球唯一的天然衛星叫什麼？', a: '月球。它會繞著地球轉。' }
  ],
  Mars: [
    { q: '火星為什麼看起來紅紅的？', a: '因為表面有很多含鐵的礦物，像生鏽一樣呈現紅色。' },
    { q: '火星有幾顆衛星？', a: '有 2 顆，叫火衛一和火衛二。' }
  ],
  Jupiter: [
    { q: '木星身上的大紅斑是什麼？', a: '那是一個超巨大的風暴，而且已經持續很久很久了。' },
    { q: '木星是太陽系最大的行星嗎？', a: '是的，木星是太陽系最大的行星。' }
  ],
  Saturn: [
    { q: '土星光環是一整片硬硬的圓盤嗎？', a: '不是喔！光環是由很多冰塊、石頭和塵埃組成的。' },
    { q: '土星最容易被認出來的特色是什麼？', a: '漂亮又明顯的光環。' }
  ],
  Uranus: [
    { q: '天王星為什麼很特別？', a: '它幾乎是躺著自轉，像在太空中側躺翻滾。' },
    { q: '天王星的淡藍色主要跟什麼有關？', a: '跟大氣裡的甲烷有關。' }
  ],
  Neptune: [
    { q: '海王星離太陽很遠，所以它大概是什麼感覺？', a: '非常寒冷，而且風速很快，是神祕的藍色星球。' },
    { q: '海王星繞太陽一圈大約要多久？', a: '大約 165 個地球年。' }
  ],
  Pluto: [
    { q: '冥王星現在還算八大行星之一嗎？', a: '不算了，現在被分類為矮行星。' },
    { q: '冥王星小小又很遠，還值得認識嗎？', a: '值得！它提醒我們太陽系邊緣還有很多未知世界。' }
  ],
  Ceres: [
    { q: '穀神星住在哪裡？', a: '穀神星在火星和木星之間的小行星帶，是小行星帶裡最大的天體。' },
    { q: '穀神星是行星嗎？', a: '它不是八大行星，現在被分類為矮行星。' }
  ],
  Haumea: [
    { q: '妊神星為什麼很特別？', a: '它自轉很快，形狀像被拉長的橄欖球。' },
    { q: '妊神星在哪一區？', a: '它在海王星外側的柯伊伯帶附近。' }
  ],
  Makemake: [
    { q: '鳥神星離太陽近還是遠？', a: '很遠喔！它也在海王星外側，是冰冷的小世界。' },
    { q: '鳥神星是什麼種類？', a: '它是矮行星。' }
  ],
  Eris: [
    { q: '鬩神星為什麼有名？', a: '它的發現讓科學家重新討論「什麼才算行星」，也讓冥王星改分類。' },
    { q: '鬩神星比冥王星近還是遠？', a: '通常更遠，是太陽系外圍非常遙遠的矮行星。' }
  ],
  CometHalley: [
    { q: '哈雷彗星多久會回來一次？', a: '大約每 76 年會接近太陽一次。' },
    { q: '彗星尾巴一定在後面嗎？', a: '彗星尾巴通常會被太陽風吹向遠離太陽的方向，不一定跟飛行方向相反。' }
  ]
};
let activeTriviaPlanet = 'Earth';
let activeTriviaIndex = 0;

function renderTrivia(planet = activeTriviaPlanet, advance = false) {
  const list = planetTrivia[planet] || planetTrivia.Earth;
  activeTriviaPlanet = planet;
  if (advance) activeTriviaIndex = (activeTriviaIndex + 1) % list.length;
  else activeTriviaIndex = activeTriviaIndex % list.length;
  const item = list[activeTriviaIndex];
  const q = document.getElementById('triviaQuestion');
  const a = document.getElementById('triviaAnswer');
  if (q) q.innerText = `${zhNameMap[planet] || '地球'}問題：${item.q}`;
  if (a) a.innerText = '';
}
function showTriviaAnswer() {
  const list = planetTrivia[activeTriviaPlanet] || planetTrivia.Earth;
  const item = list[activeTriviaIndex];
  const a = document.getElementById('triviaAnswer');
  if (a) a.innerText = item.a;
}
function nextTrivia() { renderTrivia(activeTriviaPlanet, true); }
window.showTriviaAnswer = showTriviaAnswer;
window.nextTrivia = nextTrivia;

function getPlanetByName(name) {
  return celestialMap[name];
}

function flyToPlanetByName(name) {
  const planet = getPlanetByName(name);
  if (!planet) return;
  selectedPlanet = planet;
  closeInfoNoZoomOut();
  settings.accelerationOrbit = 0;
  const planetPosition = new THREE.Vector3();
  selectedPlanet.planet.getWorldPosition(planetPosition);
  controls.target.copy(planetPosition);
  camera.lookAt(planetPosition);
  offset = selectableOffsets[name] || 20;
  targetCameraPosition.copy(planetPosition).add(camera.position.clone().sub(planetPosition).normalize().multiplyScalar(offset));
  isMovingTowardsPlanet = true;
  document.body.classList.add('is-warping');
  clearTimeout(focusFallbackTimer);
  focusFallbackTimer = setTimeout(() => {
    if (selectedPlanet === planet && isMovingTowardsPlanet) {
      isMovingTowardsPlanet = false;
      showPlanetInfo(name);
    }
  }, 2600);
}
window.flyToPlanetByName = flyToPlanetByName;

function resetExplorerView() {
  closeInfo();
  document.body.classList.remove('is-warping');
}
window.resetExplorerView = resetExplorerView;

// ******  SHOW PLANET INFO AFTER SELECTION  ******
function showPlanetInfo(planet) {
  var info = document.getElementById('planetInfo');
  var name = document.getElementById('planetName');
  var details = document.getElementById('planetDetails');
  const data = planetData[planet];

  name.innerText = `${zhNameMap[planet] || planet} ${data.emoji || ''}`;
  details.innerHTML = `
    <span class="mission-chip">魚寶太空探險</span>
    <span class="mission-chip fact-chip">${data.badge || '太陽系小知識'}</span>
    <dl class="fact-grid">
      <div><dt>半徑</dt><dd>${data.radius}</dd></div>
      <div><dt>自轉</dt><dd>${data.rotation}</dd></div>
      <div><dt>公轉</dt><dd>${data.orbit}</dd></div>
      <div><dt>距離太陽</dt><dd>${data.distance}</dd></div>
      <div><dt>衛星</dt><dd>${data.moons}</dd></div>
      <div><dt>傾斜</dt><dd>${data.tilt}</dd></div>
    </dl>
    <p class="planet-story">${data.info}</p>
    <p class="guide-note">小任務：看完這顆星球後，按右邊「看答案」挑戰一題太空小問答！</p>
  `;

  info.style.display = 'block';
  renderTrivia(planet);
  document.body.classList.remove('is-warping');
}
let isZoomingOut = false;
let zoomOutTargetPosition = new THREE.Vector3(-175, 115, 5);
// close 'x' button function
function closeInfo() {
  var info = document.getElementById('planetInfo');
  info.style.display = 'none';
  settings.accelerationOrbit = 1;
  isZoomingOut = true;
  controls.target.set(0, 0, 0);
}
window.closeInfo = closeInfo;
// close info when clicking another planet
function closeInfoNoZoomOut() {
  var info = document.getElementById('planetInfo');
  info.style.display = 'none';
  settings.accelerationOrbit = 1;
}
// ******  SUN  ******
let sunMat;

const sunSize = 697/40; // 40 times smaller scale than earth
const sunGeom = new THREE.SphereGeometry(sunSize, 32, 20);
sunMat = new THREE.MeshStandardMaterial({
  emissive: 0xFFF88F,
  emissiveMap: loadTexture.load(sunTexture),
  emissiveIntensity: settings.sunIntensity
});
const sun = new THREE.Mesh(sunGeom, sunMat);
scene.add(sun);

//point light in the sun
const pointLight = new THREE.PointLight(0xFDFFD3 , 1200, 400, 1.4);
scene.add(pointLight);


// ******  PLANET CREATION FUNCTION  ******
function createPlanet(planetName, size, position, tilt, texture, bump, ring, atmosphere, moons){

  let material;
  if (texture instanceof THREE.Material){
    material = texture;
  } 
  else if(bump){
    material = new THREE.MeshPhongMaterial({
    map: loadTexture.load(texture),
    bumpMap: loadTexture.load(bump),
    bumpScale: 0.7
    });
  }
  else {
    material = new THREE.MeshPhongMaterial({
    map: loadTexture.load(texture)
    });
  } 

  const name = planetName;
  const geometry = new THREE.SphereGeometry(size, 32, 20);
  const planet = new THREE.Mesh(geometry, material);
  const planet3d = new THREE.Object3D;
  const planetSystem = new THREE.Group();
  planetSystem.add(planet);
  let Atmosphere;
  let Ring;
  planet.position.x = position;
  planet.rotation.z = tilt * Math.PI / 180;

  // add orbit path
  const orbitPath = new THREE.EllipseCurve(
    0, 0,            // ax, aY
    position, position, // xRadius, yRadius
    0, 2 * Math.PI,   // aStartAngle, aEndAngle
    false,            // aClockwise
    0                 // aRotation
);

  const pathPoints = orbitPath.getPoints(100);
  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.03 });
  const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
  orbit.rotation.x = Math.PI / 2;
  planetSystem.add(orbit);

  //add ring
  if(ring)
  {
    const RingGeo = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius,30);
    const RingMat = new THREE.MeshStandardMaterial({
      map: loadTexture.load(ring.texture),
      side: THREE.DoubleSide
    });
    Ring = new THREE.Mesh(RingGeo, RingMat);
    planetSystem.add(Ring);
    Ring.position.x = position;
    Ring.rotation.x = -0.5 *Math.PI;
    Ring.rotation.y = -tilt * Math.PI / 180;
  }
  
  //add atmosphere
  if(atmosphere){
    const atmosphereGeom = new THREE.SphereGeometry(size+0.1, 32, 20);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      map:loadTexture.load(atmosphere),
      transparent: true,
      opacity: 0.4,
      depthTest: true,
      depthWrite: false
    })
    Atmosphere = new THREE.Mesh(atmosphereGeom, atmosphereMaterial)
    
    Atmosphere.rotation.z = 0.41;
    planet.add(Atmosphere);
  }

  //add moons
  if(moons){
    moons.forEach(moon => {
      let moonMaterial;
      
      if(moon.bump){
        moonMaterial = new THREE.MeshStandardMaterial({
          map: loadTexture.load(moon.texture),
          bumpMap: loadTexture.load(moon.bump),
          bumpScale: 0.5
        });
      } else{
        moonMaterial = new THREE.MeshStandardMaterial({
          map: loadTexture.load(moon.texture)
        });
      }
      const moonGeometry = new THREE.SphereGeometry(moon.size, 32, 20);
      const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
      const moonOrbitDistance = size * 1.5;
      moonMesh.position.set(moonOrbitDistance, 0, 0);
      planetSystem.add(moonMesh);
      moon.mesh = moonMesh;
    });
  }
  //add planet system to planet3d object and to the scene
  planet3d.add(planetSystem);
  scene.add(planet3d);
  return {name, planet, planet3d, Atmosphere, moons, planetSystem, Ring};
}



function createSmallBody(name, size, position, color, orbitOpacity = 0.08, tail = false) {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.05,
    emissive: color,
    emissiveIntensity: tail ? 0.22 : 0.05
  });
  const body = createPlanet(name, size, position, 0, material);
  body.planet.userData.name = name;
  body.planetSystem.children.forEach(child => {
    if (child.type === 'LineLoop' && child.material) child.material.opacity = orbitOpacity;
  });
  if (tail) {
    const tailGeometry = new THREE.ConeGeometry(size * 0.85, size * 6.5, 18, 1, true);
    const tailMaterial = new THREE.MeshBasicMaterial({ color: 0x9fe9ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    const tailMesh = new THREE.Mesh(tailGeometry, tailMaterial);
    tailMesh.rotation.z = Math.PI / 2;
    tailMesh.position.x = position + size * 4.2;
    tailMesh.position.y = size * 0.15;
    body.planetSystem.add(tailMesh);
    body.tail = tailMesh;
  }
  animatedSmallBodies.push(body);
  return body;
}

// ******  LOADING OBJECTS METHOD  ******
function loadObject(path, position, scale, callback) {
  const loader = new GLTFLoader();

  loader.load(path, function (gltf) {
      const obj = gltf.scene;
      obj.position.set(position, 0, 0);
      obj.scale.set(scale, scale, scale);
      scene.add(obj);
      if (callback) {
        callback(obj);
      }
  }, undefined, function (error) {
      console.error('An error happened', error);
  });
}

// ******  ASTEROIDS  ******
const asteroids = [];
function loadAsteroids(path, numberOfAsteroids, minOrbitRadius, maxOrbitRadius) {
  const loader = new GLTFLoader();
  loader.load(path, function (gltf) {
      gltf.scene.traverse(function (child) {
          if (child.isMesh) {
              for (let i = 0; i < numberOfAsteroids / 12; i++) { // Divide by 12 because there are 12 asteroids in the pack
                  const asteroid = child.clone();
                  const orbitRadius = THREE.MathUtils.randFloat(minOrbitRadius, maxOrbitRadius);
                  const angle = Math.random() * Math.PI * 2;
                  const x = orbitRadius * Math.cos(angle);
                  const y = 0;
                  const z = orbitRadius * Math.sin(angle);
                  child.receiveShadow = true;
                  asteroid.position.set(x, y, z);
                  asteroid.scale.setScalar(THREE.MathUtils.randFloat(0.8, 1.2));
                  scene.add(asteroid);
                  asteroids.push(asteroid);
              }
          }
      });
  }, undefined, function (error) {
      console.error('An error happened', error);
  });
}


// Earth day/night effect shader material
const earthMaterial = new THREE.ShaderMaterial({
  uniforms: {
    dayTexture: { type: "t", value: loadTexture.load(earthTexture) },
    nightTexture: { type: "t", value: loadTexture.load(earthNightTexture) },
    sunPosition: { type: "v3", value: sun.position }
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vSunDirection;

    uniform vec3 sunPosition;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
      vSunDirection = normalize(sunPosition - worldPosition.xyz);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;

    varying vec3 vNormal;
    varying vec2 vUv;
    varying vec3 vSunDirection;

    void main() {
      float intensity = max(dot(vNormal, vSunDirection), 0.0);
      vec4 dayColor = texture2D(dayTexture, vUv);
      vec4 nightColor = texture2D(nightTexture, vUv)* 0.2;
      gl_FragColor = mix(nightColor, dayColor, intensity);
    }
  `
});


// ******  MOONS  ******
// Earth
const earthMoon = [{
  size: 1.6,
  texture: earthMoonTexture,
  bump: earthMoonBump,
  orbitSpeed: 0.001 * settings.accelerationOrbit,
  orbitRadius: 10
}]

// Mars' moons with path to 3D models (phobos & deimos)
const marsMoons = [
  {
    modelPath: phobosModelUrl,
    scale: 0.1,
    orbitRadius: 5,
    orbitSpeed: 0.002 * settings.accelerationOrbit,
    position: 100,
    mesh: null
  },
  {
    modelPath: deimosModelUrl,
    scale: 0.1,
    orbitRadius: 9,
    orbitSpeed: 0.0005 * settings.accelerationOrbit,
    position: 120,
    mesh: null
  }
];

// Jupiter
const jupiterMoons = [
  {
    size: 1.6,
    texture: ioTexture,
    orbitRadius: 20,
    orbitSpeed: 0.0005 * settings.accelerationOrbit
  },
  {
    size: 1.4,
    texture: europaTexture,
    orbitRadius: 24,
    orbitSpeed: 0.00025 * settings.accelerationOrbit
  },
  {
    size: 2,
    texture: ganymedeTexture,
    orbitRadius: 28,
    orbitSpeed: 0.000125 * settings.accelerationOrbit
  },
  {
    size: 1.7,
    texture: callistoTexture,
    orbitRadius: 32,
    orbitSpeed: 0.00006 * settings.accelerationOrbit
  }
];

// ******  PLANET CREATIONS  ******
const mercury = new createPlanet('Mercury', 2.4, 40, 0, mercuryTexture, mercuryBump);
const venus = new createPlanet('Venus', 6.1, 65, 3, venusTexture, venusBump, null, venusAtmosphere);
const earth = new createPlanet('Earth', 6.4, 90, 23, earthMaterial, null, null, earthAtmosphere, earthMoon);
const mars = new createPlanet('Mars', 3.4, 115, 25, marsTexture, marsBump)
// Load Mars moons
marsMoons.forEach(moon => {
  loadObject(moon.modelPath, moon.position, moon.scale, function(loadedModel) {
    moon.mesh = loadedModel;
    mars.planetSystem.add(moon.mesh);
    moon.mesh.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  });
});

const jupiter = new createPlanet('Jupiter', 69/4, 200, 3, jupiterTexture, null, null, null, jupiterMoons);
const saturn = new createPlanet('Saturn', 58/4, 270, 26, saturnTexture, null, {
  innerRadius: 18, 
  outerRadius: 29, 
  texture: satRingTexture
});
const uranus = new createPlanet('Uranus', 25/4, 320, 82, uranusTexture, null, {
  innerRadius: 6, 
  outerRadius: 8, 
  texture: uraRingTexture
});
const neptune = new createPlanet('Neptune', 24/4, 340, 28, neptuneTexture);
const pluto = new createPlanet('Pluto', 1, 350, 57, plutoTexture)
const ceres = createSmallBody('Ceres', 1.15, 150, 0xb9aa8f, 0.14);
const haumea = createSmallBody('Haumea', 1.05, 378, 0xd8d2c8, 0.06);
haumea.planet.scale.set(1.75, 0.75, 0.75);
const makemake = createSmallBody('Makemake', 1.2, 392, 0xb77a5a, 0.06);
const eris = createSmallBody('Eris', 1.25, 415, 0xdfe9f2, 0.06);
const cometHalley = createSmallBody('CometHalley', 0.85, 125, 0x8fdcff, 0.18, true);
cometHalley.planet3d.rotation.z = 0.28;

celestialMap = { Mercury: mercury, Venus: venus, Earth: earth, Mars: mars, Ceres: ceres, Jupiter: jupiter, Saturn: saturn, Uranus: uranus, Neptune: neptune, Pluto: pluto, Haumea: haumea, Makemake: makemake, Eris: eris, CometHalley: cometHalley };

  // ******  PLANETS DATA  ******
  const planetData = {
    'Mercury': {
        badge: '離太陽最近',
        emoji: '☿',
        radius: '2,439.7 km',
        tilt: '0.034°',
        rotation: '約 58.6 個地球日',
        orbit: '約 88 個地球日',
        distance: '約 5,790 萬公里',
        moons: '0 顆',
        info: '水星是離太陽最近、也是最小的行星。白天很熱、夜晚很冷，像一顆勇敢靠近太陽的小石頭。'
    },
    'Venus': {
        badge: '最熱的行星',
        emoji: '♀',
        radius: '6,051.8 km',
        tilt: '177.4°',
        rotation: '約 243 個地球日',
        orbit: '約 225 個地球日',
        distance: '約 1.082 億公里',
        moons: '0 顆',
        info: '金星有厚厚的大氣，就像包著棉被的星球，所以表面非常炎熱。它也是夜空中很亮的「明星」。'
    },
    'Earth': {
        badge: '我們的家',
        emoji: '🌍',
        radius: '6,371 km',
        tilt: '23.5°',
        rotation: '24 小時',
        orbit: '365 天',
        distance: '約 1.5 億公里',
        moons: '1 顆（月球）',
        info: '地球是我們的家，有海洋、空氣和生命。也因為地球每天自轉，我們才會看到白天和黑夜。'
    },
    'Mars': {
        badge: '紅色星球',
        emoji: '♂',
        radius: '3,389.5 km',
        tilt: '25.19°',
        rotation: '約 1.03 個地球日',
        orbit: '約 687 個地球日',
        distance: '約 2.279 億公里',
        moons: '2 顆（火衛一、火衛二）',
        info: '火星因為表面含有氧化鐵，看起來紅紅的，所以被叫做紅色星球。人類很想有一天去火星探險。'
    },
    'Jupiter': {
        badge: '最大行星',
        emoji: '♃',
        radius: '69,911 km',
        tilt: '3.13°',
        rotation: '約 9.9 小時',
        orbit: '約 12 個地球年',
        distance: '約 7.785 億公里',
        moons: '已知超過 90 顆',
        info: '木星是太陽系最大的行星，像一位巨人。它身上的大紅斑，其實是一個已經吹了很久很久的巨大風暴。'
    },
    'Saturn': {
        badge: '光環明星',
        emoji: '♄',
        radius: '58,232 km',
        tilt: '26.73°',
        rotation: '約 10.7 小時',
        orbit: '約 29.5 個地球年',
        distance: '約 14 億公里',
        moons: '已知超過 100 顆',
        info: '土星最有名的是漂亮的光環。那些光環不是一整片，而是由冰塊、石頭和塵埃組成。'
    },
    'Uranus': {
        badge: '側躺自轉',
        emoji: '♅',
        radius: '25,362 km',
        tilt: '97.77°',
        rotation: '約 17.2 小時',
        orbit: '約 84 個地球年',
        distance: '約 29 億公里',
        moons: '27 顆',
        info: '天王星很特別，幾乎是「躺著」自轉。它淡藍色的外表，來自大氣裡的甲烷。'
    },
    'Neptune': {
        badge: '藍色遠方',
        emoji: '♆',
        radius: '24,622 km',
        tilt: '28.32°',
        rotation: '約 16.1 小時',
        orbit: '約 165 個地球年',
        distance: '約 45 億公里',
        moons: '14 顆',
        info: '海王星離太陽很遠，顏色深藍，風速非常快，是太陽系裡很有神祕感的藍色星球。'
    },
    'Pluto': {
        badge: '矮行星',
        emoji: '♇',
        radius: '1,188.3 km',
        tilt: '122.53°',
        rotation: '約 6.4 個地球日',
        orbit: '約 248 個地球年',
        distance: '約 59 億公里',
        moons: '5 顆',
        info: '冥王星現在被分類為矮行星。雖然它小小的、很遠，但它提醒我們：宇宙裡還有很多值得探索的地方。'
    },
    'Ceres': {
        badge: '小行星帶最大成員',
        emoji: '⚪',
        radius: '約 470 km',
        tilt: '約 4°',
        rotation: '約 9 小時',
        orbit: '約 4.6 個地球年',
        distance: '約 4.1 億公里',
        moons: '0 顆',
        info: '穀神星在火星和木星之間的小行星帶，是小行星帶中最大的天體，也是離我們很近的一顆矮行星。'
    },
    'Haumea': {
        badge: '轉很快的橄欖球',
        emoji: '🥚',
        radius: '約 816 km',
        tilt: '約 126°',
        rotation: '約 3.9 小時',
        orbit: '約 285 個地球年',
        distance: '約 64 億公里',
        moons: '2 顆',
        info: '妊神星自轉非常快，形狀被拉得像橄欖球，還有淡淡的光環，是太陽系外圍很有個性的矮行星。'
    },
    'Makemake': {
        badge: '冰冷紅色小世界',
        emoji: '🟤',
        radius: '約 715 km',
        tilt: '約 29°',
        rotation: '約 22.8 小時',
        orbit: '約 306 個地球年',
        distance: '約 68 億公里',
        moons: '1 顆',
        info: '鳥神星位在海王星外側，表面可能有冰和有機物，顏色偏紅，是柯伊伯帶裡重要的矮行星。'
    },
    'Eris': {
        badge: '改變行星定義',
        emoji: '❄️',
        radius: '約 1,163 km',
        tilt: '約 44°',
        rotation: '約 25.9 小時',
        orbit: '約 559 個地球年',
        distance: '非常遙遠，軌道很長',
        moons: '1 顆',
        info: '鬩神星和冥王星差不多大，它的發現讓科學家重新討論行星定義，也讓矮行星這個分類更受注意。'
    },
    'CometHalley': {
        badge: '會回來的彗星',
        emoji: '☄️',
        radius: '核心約 5.5 km',
        tilt: '約 162°',
        rotation: '約 2.2 個地球日',
        orbit: '約 76 個地球年',
        distance: '軌道很長，會接近也會遠離太陽',
        moons: '0 顆',
        info: '哈雷彗星是最有名的週期彗星之一，大約每 76 年回到太陽附近一次。靠近太陽時，冰和塵埃被吹出來，就會看到漂亮的彗尾。'
    }
};


// Array of planets and atmospheres for raycasting
const raycastTargets = [
  mercury.planet, venus.planet, venus.Atmosphere, earth.planet, earth.Atmosphere,
  mars.planet, ceres.planet, jupiter.planet, saturn.planet, uranus.planet, neptune.planet,
  pluto.planet, haumea.planet, makemake.planet, eris.planet, cometHalley.planet
];

// ******  SHADOWS  ******
renderer.shadowMap.enabled = true;
pointLight.castShadow = true;

//properties for the point light
pointLight.shadow.mapSize.width = 1024;
pointLight.shadow.mapSize.height = 1024;
pointLight.shadow.camera.near = 10;
pointLight.shadow.camera.far = 20;

//casting and receiving shadows
earth.planet.castShadow = true;
earth.planet.receiveShadow = true;
earth.Atmosphere.castShadow = true;
earth.Atmosphere.receiveShadow = true;
earth.moons.forEach(moon => {
moon.mesh.castShadow = true;
moon.mesh.receiveShadow = true;
});
mercury.planet.castShadow = true;
mercury.planet.receiveShadow = true;
venus.planet.castShadow = true;
venus.planet.receiveShadow = true;
venus.Atmosphere.receiveShadow = true;
mars.planet.castShadow = true;
mars.planet.receiveShadow = true;
jupiter.planet.castShadow = true;
jupiter.planet.receiveShadow = true;
jupiter.moons.forEach(moon => {
  moon.mesh.castShadow = true;
  moon.mesh.receiveShadow = true;
  });
saturn.planet.castShadow = true;
saturn.planet.receiveShadow = true;
saturn.Ring.receiveShadow = true;
uranus.planet.receiveShadow = true;
neptune.planet.receiveShadow = true;
pluto.planet.receiveShadow = true;
animatedSmallBodies.forEach(body => {
  body.planet.castShadow = true;
  body.planet.receiveShadow = true;
});




function animate(){

  //rotating planets around the sun and itself
  sun.rotateY(0.001 * settings.acceleration);
  mercury.planet.rotateY(0.001 * settings.acceleration);
  mercury.planet3d.rotateY(0.004 * settings.accelerationOrbit);
  venus.planet.rotateY(0.0005 * settings.acceleration)
  venus.Atmosphere.rotateY(0.0005 * settings.acceleration);
  venus.planet3d.rotateY(0.0006 * settings.accelerationOrbit);
  earth.planet.rotateY(0.005 * settings.acceleration);
  earth.Atmosphere.rotateY(0.001 * settings.acceleration);
  earth.planet3d.rotateY(0.001 * settings.accelerationOrbit);
  mars.planet.rotateY(0.01 * settings.acceleration);
  mars.planet3d.rotateY(0.0007 * settings.accelerationOrbit);
  jupiter.planet.rotateY(0.005 * settings.acceleration);
  jupiter.planet3d.rotateY(0.0003 * settings.accelerationOrbit);
  saturn.planet.rotateY(0.01 * settings.acceleration);
  saturn.planet3d.rotateY(0.0002 * settings.accelerationOrbit);
  uranus.planet.rotateY(0.005 * settings.acceleration);
  uranus.planet3d.rotateY(0.0001 * settings.accelerationOrbit);
  neptune.planet.rotateY(0.005 * settings.acceleration);
  neptune.planet3d.rotateY(0.00008 * settings.accelerationOrbit);
  pluto.planet.rotateY(0.001 * settings.acceleration)
  pluto.planet3d.rotateY(0.00006 * settings.accelerationOrbit)
  ceres.planet.rotateY(0.004 * settings.acceleration);
  ceres.planet3d.rotateY(0.00095 * settings.accelerationOrbit);
  haumea.planet.rotateY(0.012 * settings.acceleration);
  haumea.planet3d.rotateY(0.00005 * settings.accelerationOrbit);
  makemake.planet.rotateY(0.003 * settings.acceleration);
  makemake.planet3d.rotateY(0.000045 * settings.accelerationOrbit);
  eris.planet.rotateY(0.002 * settings.acceleration);
  eris.planet3d.rotateY(0.000035 * settings.accelerationOrbit);
  cometHalley.planet.rotateY(0.006 * settings.acceleration);
  cometHalley.planet3d.rotateY(0.0016 * settings.accelerationOrbit);

// Animate Earth's moon
if (earth.moons) {
  earth.moons.forEach(moon => {
    const time = performance.now();
    const tiltAngle = 5 * Math.PI / 180;

    const moonX = earth.planet.position.x + moon.orbitRadius * Math.cos(time * moon.orbitSpeed);
    const moonY = moon.orbitRadius * Math.sin(time * moon.orbitSpeed) * Math.sin(tiltAngle);
    const moonZ = earth.planet.position.z + moon.orbitRadius * Math.sin(time * moon.orbitSpeed) * Math.cos(tiltAngle);

    moon.mesh.position.set(moonX, moonY, moonZ);
    moon.mesh.rotateY(0.01);
  });
}
// Animate Mars' moons
if (marsMoons){
marsMoons.forEach(moon => {
  if (moon.mesh) {
    const time = performance.now();

    const moonX = mars.planet.position.x + moon.orbitRadius * Math.cos(time * moon.orbitSpeed);
    const moonY = moon.orbitRadius * Math.sin(time * moon.orbitSpeed);
    const moonZ = mars.planet.position.z + moon.orbitRadius * Math.sin(time * moon.orbitSpeed);

    moon.mesh.position.set(moonX, moonY, moonZ);
    moon.mesh.rotateY(0.001);
  }
});
}

// Animate Jupiter's moons
if (jupiter.moons) {
  jupiter.moons.forEach(moon => {
    const time = performance.now();
    const moonX = jupiter.planet.position.x + moon.orbitRadius * Math.cos(time * moon.orbitSpeed);
    const moonY = moon.orbitRadius * Math.sin(time * moon.orbitSpeed);
    const moonZ = jupiter.planet.position.z + moon.orbitRadius * Math.sin(time * moon.orbitSpeed);

    moon.mesh.position.set(moonX, moonY, moonZ);
    moon.mesh.rotateY(0.01);
  });
}

// Rotate asteroids
asteroids.forEach(asteroid => {
  asteroid.rotation.y += 0.0001;
  asteroid.position.x = asteroid.position.x * Math.cos(0.0001 * settings.accelerationOrbit) + asteroid.position.z * Math.sin(0.0001 * settings.accelerationOrbit);
  asteroid.position.z = asteroid.position.z * Math.cos(0.0001 * settings.accelerationOrbit) - asteroid.position.x * Math.sin(0.0001 * settings.accelerationOrbit);
});

// ****** OUTLINES ON PLANETS ******
raycaster.setFromCamera(mouse, camera);

// Check for intersections
var intersects = raycaster.intersectObjects(raycastTargets);

// Reset all outlines
outlinePass.selectedObjects = [];

if (intersects.length > 0) {
  const intersectedObject = intersects[0].object;

  // If the intersected object is an atmosphere, find the corresponding planet
  if (intersectedObject === earth.Atmosphere) {
    outlinePass.selectedObjects = [earth.planet];
  } else if (intersectedObject === venus.Atmosphere) {
    outlinePass.selectedObjects = [venus.planet];
  } else {
    // For other planets, outline the intersected object itself
    outlinePass.selectedObjects = [intersectedObject];
  }
}
// ******  ZOOM IN/OUT  ******
if (isMovingTowardsPlanet) {
  // Smoothly move the camera towards the target position
  camera.position.lerp(targetCameraPosition, 0.03);

  // Check if the camera is close to the target position
  if (camera.position.distanceTo(targetCameraPosition) < 1) {
      isMovingTowardsPlanet = false;
      showPlanetInfo(selectedPlanet.name);

  }
} else if (isZoomingOut) {
  camera.position.lerp(zoomOutTargetPosition, 0.05);

  if (camera.position.distanceTo(zoomOutTargetPosition) < 1) {
      isZoomingOut = false;
  }
}

  controls.update();
  requestAnimationFrame(animate);
  composer.render();
}
loadAsteroids(asteroidPackUrl, 1000, 130, 160);
loadAsteroids(asteroidPackUrl, 3000, 352, 370);
animate();

window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('mousedown', onDocumentMouseDown, false);
window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
  composer.setSize(window.innerWidth,window.innerHeight);
});
