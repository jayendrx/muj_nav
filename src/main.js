import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const canvas = document.getElementById('canvas');

// Creating a scene
const scene = new THREE.Scene();
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// Camera
const camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.01,
    1000
);
camera.position.set(0, 5, 10);

// Graph class for storing intersections
class Graph {
    constructor() {
        this.adjacencyList = {};
    }
    
    addVertex(vertex) {
        if (!this.adjacencyList[vertex]) {
            this.adjacencyList[vertex] = [];
        }
    }
    
    addEdge(vertex1, vertex2, weight = 1) {
        this.addVertex(vertex1);
        this.addVertex(vertex2);
        this.adjacencyList[vertex1].push({ node: vertex2, weight });
        this.adjacencyList[vertex2].push({ node: vertex1, weight });
    }

    // Dijkstra's algorithm - most efficient for weighted graphs
    dijkstra(startNode, endNode) {
        const distances = {};
        const previous = {};
        const priorityQueue = new PriorityQueue();
        
        // Initialize distances
        for (let vertex in this.adjacencyList) {
            distances[vertex] = vertex === startNode ? 0 : Infinity;
            previous[vertex] = null;
            priorityQueue.enqueue(vertex, distances[vertex]);
        }
        
        while (!priorityQueue.isEmpty()) {
            const currentVertex = priorityQueue.dequeue().element;
            
            if (currentVertex === endNode) {
                // Build path
                const path = [];
                let temp = endNode;
                while (temp) {
                    path.push(temp);
                    temp = previous[temp];
                }
                return {
                    path: path.reverse(),
                    distance: distances[endNode]
                };
            }
            
            if (distances[currentVertex] !== Infinity) {
                for (let neighbor of this.adjacencyList[currentVertex]) {
                    const distance = distances[currentVertex] + neighbor.weight;
                    
                    if (distance < distances[neighbor.node]) {
                        distances[neighbor.node] = distance;
                        previous[neighbor.node] = currentVertex;
                        priorityQueue.enqueue(neighbor.node, distance);
                    }
                }
            }
        }
        
        return { path: [], distance: Infinity };
    }
}

// Priority Queue implementation for Dijkstra
class PriorityQueue {
    constructor() {
        this.collection = [];
    }
    
    enqueue(element, priority) {
        const queueElement = { element, priority };
        let contain = false;
        
        for (let i = 0; i < this.collection.length; i++) {
            if (queueElement.priority < this.collection[i].priority) {
                this.collection.splice(i, 0, queueElement);
                contain = true;
                break;
            }
        }
        
        if (!contain) {
            this.collection.push(queueElement);
        }
    }
    
    dequeue() {
        return this.collection.shift();
    }
    
    isEmpty() {
        return this.collection.length === 0;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Enhanced intersection checking with graph building
function checkIntersectionsAndBuildGraph(objects) {
    const graph = new Graph();
    const intersections = [];
    
    for (let i = 0; i < objects.length; i++) {
        const box1 = new THREE.Box3().setFromObject(objects[i]);
        
        for (let j = i + 1; j < objects.length; j++) {
            const box2 = new THREE.Box3().setFromObject(objects[j]);
            
            if (box1.intersectsBox(box2)) {
                console.debug('Objects intersect:', objects[i].name, objects[j].name);
                
                // Calculate distance between objects for weighted edges
                const distance = objects[i].position.distanceTo(objects[j].position);
                
                // Add edge to graph
                graph.addEdge(objects[i].name, objects[j].name, distance);
                intersections.push([objects[i].name, objects[j].name, distance]);
            }
        }
    }
    
    return { graph, intersections };
}

// returns the object closest to given cords
function findClosestObjectToCoords(coords, objects) {
    let minDistance = Infinity;
    let closestObject = null;
    const point = new THREE.Vector3(coords.x, coords.y, coords.z);
    console.debug("cords= ",coords)
    objects.forEach(obj => {
        
        // Compute bounding box considering rotation and scale
        const box = new THREE.Box3().setFromObject(obj);
        // Find the closest point on the bounding box to the coordinate
        const closestPoint = box.clampPoint(point, new THREE.Vector3());
        // Get Euclidean distance to the coordinate
        const distance = closestPoint.distanceTo(point);
        console.debug("checking distance for:",obj.name, "closest point to object= ", closestPoint, ", distance =",distance);
        if (distance < minDistance) {
            minDistance = distance;
            closestObject = obj;
        }
    });

    return { object: closestObject, distance: minDistance };
}

function findShortestPathBetweenCoords(startCoords, endCoords, objects) {
    // Step 1: Find closest object to start & end coords
    const startObj = findClosestObjectToCoords(startCoords, objects);
    console.debug("closest obj to start :", startObj)
    const endObj   = findClosestObjectToCoords(endCoords, objects);
    console.debug("closest obj to end :", endObj)

    if (!startObj.object || !endObj.object) {
        console.error("Could not find closest objects for given coordinates.");
        return { path: [], distance: Infinity };
    }

    console.debug("Closest to start:", startObj.object.name, "at distance", startObj.distance);
    console.debug("Closest to end:", endObj.object.name, "at distance", endObj.distance);

    // Step 2: Build graph from available objects
    const { graph } = checkIntersectionsAndBuildGraph(objects);

    // Step 3: Run Dijkstra between closest object names
    const result = graph.dijkstra(startObj.object.name, endObj.object.name);

    return result;
}



// Function to highlight shortest path objects
function highlightShortestPathObjects(model, pathNames) {
    const PATH_COLOR = 0x0000ff;
    model.traverse((child) => {
        if (child.name && pathNames.includes(child.name)) {
            // If child has a mesh, change its material color
            if (child.isMesh && child.material) {
                child.material = child.material.clone(); // avoid affecting other meshes
                child.material.color.setHex(PATH_COLOR);
            }
        }
    });
  }

// Get blender objects and process intersections
async function get_blender_objects(model) {
    const prefix = "road_";
    const roadObjects = [];
    const locationObjects =[];
    // this will hold all the objects starting with building prefix
    // for eg building_ab1
    const buildingObjects = []; 
    
    model.traverse((child) => {
        if (child.name && child.name.startsWith(prefix)) {
            roadObjects.push(child);
        }
        else if(child.name && child.name.startsWith("location")){
            locationObjects.push(child);
        }
        else if(child.name && child.name.startsWith("building")){
            buildingObjects.push(child);
        }
    });
    
    for( const obj of buildingObjects){
        // obj.position.x, obj.position.y, obj.position.z for individual cords
        console.debug(obj.name, obj.position);
    }

    for (const obj of roadObjects) {
        const box = new THREE.Box3().setFromObject(obj);
        const helper = new THREE.Box3Helper(box, 0xff0000);
        scene.add(helper);

        // console.log(obj.name, obj.position.x, obj.position.y, obj.position.z);
        // camera.position.set(obj.position.x, obj.position.y, obj.position.z);
        // await sleep(1000);
    }
    
    const { graph, intersections } = checkIntersectionsAndBuildGraph(roadObjects);
    
    console.debug("Graph adjacency list:", graph.adjacencyList);
    console.debug("Intersections found:", intersections);
    
    // Find shortest path between two nodes (example)
    if (roadObjects.length >= 2) {
        if(locationObjects.length >= 2){
            const startCords = locationObjects[0].position;
            const endCords = locationObjects[1].position;
            const result = findShortestPathBetweenCoords(startCords, endCords,roadObjects);
            console.debug("Shortest path from", startCords ,"to" ,endCords,"is", result.path);
            console.debug(`Total distance:`, result.distance);
            highlightShortestPathObjects(model, result.path);
        }
    }
    
    return graph;
}

// Model loading
const loader = new GLTFLoader();
loader.load("./clg_with_waypoints.glb", (gltf) => {
    const model = gltf.scene;
    model.position.set(0, -1, 0);
    scene.add(model);
    get_blender_objects(model);
});

// Light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
const ambientLight = new THREE.AmbientLight(0xffffff, 3);
scene.add(ambientLight);
scene.add(directionalLight);

// Orbit controls
const controls = new OrbitControls(camera, document.getElementById("canvas"));
controls.enableDamping = true;
controls.enablePan = true;
controls.enableZoom = true;

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.clearColor(0xffffff, 1.0);

// Resize
window.addEventListener("resize", () => {
    console.debug("resizing");
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
