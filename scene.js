import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import * as dat from 'https://cdn.skypack.dev/dat.gui';

var scene, camera, renderer, controls, clock, canvas;
var width, height;
var isWireframeEnabled = false, isModelRotating = false;
var params, lights;

var currentTexturePath = "./assets/images/coca cola texture.png"

initializeScene();

const drinkSelect = document.getElementById("drinks");
drinkSelect.addEventListener("change", function(){
    var value = document.getElementById("drinks").value;
    currentTexturePath = value;
    mesh = loadNewMesh("./assets/models/can", "opening")
});

const openCanBtn = document.getElementById("openCanBtn");
openCanBtn.addEventListener('click', openCan);

const crushCanBtn = document.getElementById("crushCanBtn");
crushCanBtn.addEventListener('click', crushCan);

const wireframeBtn = document.getElementById("toggleWireframeBtn");
wireframeBtn.addEventListener('click', toggleWireframe);

const rotationBtn = document.getElementById("toggleRotationBtn");
rotationBtn.addEventListener('click', () => isModelRotating = !isModelRotating);

window.addEventListener('resize', onResize, false);

renderer.setAnimationLoop(animate);

function animate(){
    if(isModelRotating && mesh) mesh.rotation.y += 0.01;

    if(mixer){
        mixer.update(clock.getDelta());
    }

    movingLight();

    renderer.render(scene, camera);
}

function movingLight(){
    if(params.dir.moving){
        var time = clock.getElapsedTime();
        var deltaX = Math.sin(time) * 10;
        var deltaZ = Math.cos(time) * 10;

        lights.dirLight.position.x = deltaX;
        lights.dirLight.position.z = deltaZ;
    }
}

var mesh, actions = [], mixer;
var openSound, crushSound;

function loadNewMesh(modelPathPrefix, animationName){
    if(mesh) scene.remove(mesh);

    const loader = new GLTFLoader();
    loader.load(modelPathPrefix + "_" + animationName + ".glb", function(gltf){
        const model = gltf.scene;
        mesh = model;

        scene.add(mesh);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(currentTexturePath, function(texture){
            var can = mesh.getObjectByName("Cylinder_1");

            let material = can.material.clone();
            material.map = texture;
            material.needsUpdate = true;
            material.metalness = params.canMaterial.metalness;

            can.material = material;

            if(isWireframeEnabled){
                scene.traverse(function(object){
                    if(object.isMesh){
                        object.material.wireframe = isWireframeEnabled;
                    }
                });
            } 
        });

        mixer = new THREE.AnimationMixer(mesh);
        const animations = gltf.animations;

        actions = [];
        animations.forEach(clip => {
            var action = mixer.clipAction(clip);
            action.clampWhenFinished = true;
            action.setLoop(THREE.LoopOnce);
            actions.push(action);
        });
    });
}

function updateMetalness(value){
    var can = mesh.getObjectByName("Cylinder_1");

    let material = can.material.clone();
    material.needsUpdate = true;
    material.metalness = value;

    can.material = material;

    if(isWireframeEnabled){
        scene.traverse(function(object){
            if(object.isMesh){
                object.material.wireframe = isWireframeEnabled;
            }
        });
    } 
}

function playAnimation(){
    actions.forEach(action => {
        action.timeScale = 1;
        action.reset();
        action.play();
    });
}

function playSound(animationName){
    openSound.stop();
    crushSound.stop();
    if(animationName === "opening"){
        openSound.play();
    }
    else if(animationName ==="crush"){
        crushSound.play();
    }
}

function loadAndPlay(modelPathPrefix, animationName){
    mesh = loadNewMesh(modelPathPrefix, animationName)
    setTimeout(function(){
        playAnimation();
        playSound(animationName);
    }, 100);
}

function openCan(){
    loadAndPlay("./assets/models/can", "opening")
}

function crushCan(){
    loadAndPlay("./assets/models/can", "crush")
}

function toggleWireframe(){
    isWireframeEnabled = !isWireframeEnabled;
    scene.traverse(function(object){
        if(object.isMesh){
            object.material.wireframe = isWireframeEnabled;
        }
    });
}

function getWidth() {
  return parseInt(window.getComputedStyle(canvas).width);
}

function getHeight() {
  return parseInt(window.getComputedStyle(canvas).height);
}

function onResize(){
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function initializeRenderer(){
    renderer = new THREE.WebGLRenderer({canvas: canvas});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
}

function initializeCamera(){
    camera = new THREE.PerspectiveCamera(75, getWidth() / getHeight(), 0.1, 1000);
    camera.aspect = width / height;
    camera.position.z = 5;
    onResize();

}

function initializeAudio(){
    const listener = new THREE.AudioListener();
    camera.add(listener);

    openSound = new THREE.Audio(listener);
    crushSound = new THREE.Audio(listener);

    const audioloader = new THREE.AudioLoader();
    audioloader.load('./assets/sounds/can_opening.wav', function(buffer){
        openSound.setBuffer(buffer);
        openSound.setLoop(false);
        openSound.setVolume(1.0);
    });
    audioloader.load('./assets/sounds/can_crushing.wav', function(buffer){
        crushSound.setBuffer(buffer);
        crushSound.setLoop(false);
        crushSound.setVolume(1.0);
    });
}

function initializeControls(){

    controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
}

function initializeGUI(){
    const gui = new dat.GUI({autoPlace: false});
    const guiContainer = document.getElementById('gui-container');
    guiContainer.appendChild(gui.domElement);

    params = {
        canMaterial: {
            metalness: 0.7,
        },
        background: {
            color: 0x212529
        },
        dir: {
            enable: true,
            color: 0xFFFFFF,
            moving: false
        }
    }

    const materialFolder = gui.addFolder('Can Material');
    materialFolder.add(params.canMaterial, 'metalness', 0, 1).onChange(value => updateMetalness(value));

    const backgroundFolder = gui.addFolder('Background');
    backgroundFolder.addColor(params.background, 'color').onChange(value => scene.background = new THREE.Color(value));

    const dirFolder = gui.addFolder('Directional Light');
    dirFolder.add(params.dir, 'enable').onChange(value => {lights.dirLight.visible = value});
    dirFolder.add(params.dir, 'moving');
    dirFolder.addColor(params.dir, 'color').onChange(value => {lights.dirLight.color = new THREE.Color(value)});
}


function initializeScene(){
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x212529);

    clock = new THREE.Clock();

    canvas = document.getElementById('threeJSContainer');
    width = canvas.clientWidth;
    height = canvas.clientHeight;

    initializeRenderer();
    initializeCamera();
    initializeAudio();
    initializeControls();
    initializeGUI();

    // Objects 
    mesh = loadNewMesh("./assets/models/can", "opening")

    lights = {};

    lights.hemisphereLight = new THREE.HemisphereLight('white', 'darkslategrey', 3);
    scene.add(lights.hemisphereLight);

    lights.dirLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    lights.dirLight.position.set(0,5,2);
    scene.add(lights.dirLight);

    lights.pointLight = new THREE.PointLight(0xFFFFFF, 5);
    lights.pointLight.position.set(1, -4, 0);
    scene.add(lights.pointLight);

}