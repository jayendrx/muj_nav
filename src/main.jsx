import React, { StrictMode, useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import './style.css';

let model = null;
let globalScene = null;
let globalCamera = null;
let globalControls = null;

function ModelLoader() {
  const { scene, camera } = useThree();
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    globalScene = scene; 
    const loader = new GLTFLoader();
    loader.load('/muj_nav/clg_with_waypoints.glb', (gltf) => {
      model = gltf.scene;
      model.position.set(0, -1, 0);
      scene.add(model);
      setModelLoaded(true);
      afterModelInit();
    });
  }, [scene, camera]);

  return null;
}

function Scene() {
  const controlsRef = useRef();

  useEffect(() => {
    if (controlsRef.current) {
      globalControls = controlsRef.current;
    }
  }, []);

  return (
    <>
      <OrbitControls ref={controlsRef} />
      <ambientLight intensity={3} />
      <directionalLight position={[5, 10, 7.5]} intensity={1} />
      <ModelLoader />
      <axesHelper args={[5]} />
    </>
  );
}

function App() {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [locationObjects, setLocationObjects] = useState([]);

  const handleResetView = () => {
    if (globalCamera) {
      globalCamera.position.set(0, 5, 10);
      globalCamera.updateProjectionMatrix();
    }
    if (globalControls) {
      globalControls.target.set(0, 0, 0);
      globalControls.update();
    }
  };

  useEffect(() => {
    // Wait for model to load and extract navigation objects
    const checkModelLoaded = setInterval(() => {
      if (model) {
        const navObjects = getBlenderObjects("road");
        if (navObjects.length > 0) {
          setLocationObjects(navObjects);
          if (selectedSource === '') setSelectedSource(navObjects[0].name);
          if (selectedDestination === '') setSelectedDestination(navObjects[1]?.name || '');
          clearInterval(checkModelLoaded);
        }
      }
    }, 100);
    return () => clearInterval(checkModelLoaded);
  }, []);

  const handleSourceSelect = (e) => {
    setSelectedSource(e.target.value);
    if (selectedDestination && selectedDestination !== e.target.value) {
      highlightPathBetweenSelectedObjects(e.target.value, selectedDestination);
    }
  };

  const handleDestinationSelect = (e) => {
    setSelectedDestination(e.target.value);
    if (selectedSource && selectedSource !== e.target.value) {
      highlightPathBetweenSelectedObjects(selectedSource, e.target.value);
    }
  };

  return (
    <div className="container">
      <Canvas
        camera={{
          position: [0, 5, 10],
          fov: 40,
          near: 0.01,
          far: 1000,
        }}
        gl={{ antialias: true, clearColor: 0xffffff }}
      >
        <Scene />
      </Canvas>

        <div className="ui-top-mid">
            <h1>MUJ Navigation</h1>
        </div>
      {/* Top Left UI */}
      <div className="ui-top-left">
        <div className="block-selector">
          <label htmlFor="source-dropdown">Select Source:</label>
          <select 
            id="source-dropdown"
            value={selectedSource}
            onChange={handleSourceSelect}
            className="dropdown"
          >
            <option value="">Choose location...</option>
            {locationObjects.map((obj) => (
              <option key={obj.name} value={obj.name}>
                {obj.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Right UI */}
      <div className="ui-top-right">
        <div className="block-selector">
          <label htmlFor="destination-dropdown">Select Destination:</label>
          <select 
            id="destination-dropdown"
            value={selectedDestination}
            onChange={handleDestinationSelect}
            className="dropdown"
          >
            <option value="">Choose location...</option>
            {locationObjects.map((obj) => (
              <option key={obj.name} value={obj.name}>
                {obj.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottom Left UI */}
      {isVisible && (
        <div className="ui-bottom-left">
        <p className="info-text">Rotate: Left click + Drag</p>
        <p className="info-text">Zoom: Scroll wheel</p>
        <p className="info-text">Pan: Right click + Drag</p>
          <div className="panel">
            <h2>Scene Info</h2>
            <div className="info-item">
              <span>Model:</span>
              <span>CLG with Waypoints</span>
            </div>
            <div className="info-item">
              <span>Status:</span>
              <span className="status-active">Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Right UI */}
      <div className="ui-bottom-right">
        <button className="btn-primary" onClick={handleResetView}>Reset View</button>
        <button className="btn-secondary">Settings</button>
        <button 
          className="btn-toggle"
          onClick={() => setIsVisible(!isVisible)}
        >
          {isVisible ? 'Hide Info' : 'Show Info'}
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App/>
  </StrictMode> 
);



// ============== Helper Functions ==============

// Highlight path between selected objects by name
function highlightPathBetweenSelectedObjects(sourceName, destName) {
    if (!sourceName || !destName || sourceName === destName) return;
    
    // Clear previous highlights
    hidePathObjects();
    
    const roadObjects = getBlenderObjects("road");
    
    // Find location objects by name to get their positions
    let sourceObj = null;
    let destObj = null;
    
    model.traverse((child) => {
        if (child.name === sourceName) sourceObj = child;
        if (child.name === destName) destObj = child;
    });
    
    if (!sourceObj || !destObj) {
        console.error("Could not find source or destination objects");
        return;
    }
    
    const startCoords = sourceObj.position;
    const endCoords = destObj.position;
    
    const result = findPathBetweenCoords(startCoords, endCoords, roadObjects);
    ShowPathObjects(result.path);
    
    console.log("Path from", sourceName, "to", destName, ":", result.path);
    console.log("Distance:", result.distance);
}



// Get the url parameters
function url_parser() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const pos_x1 = urlParams.get('x1');
    const pos_y1 = urlParams.get('y1');
    const pos_x2 = urlParams.get('x2');
    const pos_y2 = urlParams.get('y2');
    if (pos_x1 != null && pos_y1 != null && pos_x2 != null && pos_y2 != null) {
        // findClosestObjectToCoords
        const startCoords = new THREE.Vector3(pos_x1,2,pos_y1);
        const endCoords = new THREE.Vector3(pos_x2,2,pos_y2);
        const locationObjects = getBlenderObjects("location");
        locationObjects[0].position.set(startCoords.x,startCoords.y,startCoords.z);
        locationObjects[1].position.set(endCoords.x,endCoords.y,endCoords.z);
        showPathBetweenCoords(startCoords,endCoords);
    }
    ;
}

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
    console.debug("cords= ", coords)
    objects.forEach(obj => {

        // Compute bounding box considering rotation and scale
        const box = new THREE.Box3().setFromObject(obj);
        // Find the closest point on the bounding box to the coordinate
        const closestPoint = box.clampPoint(point, new THREE.Vector3());
        // Get Euclidean distance to the coordinate
        const distance = closestPoint.distanceTo(point);
        console.debug("checking distance for:", obj.name, "closest point to object= ", closestPoint, ", distance =", distance);
        if (distance < minDistance) {
            minDistance = distance;
            closestObject = obj;
        }
    });

    return { object: closestObject, distance: minDistance };
}

// Function to highlight shortest path objects
function ShowPathObjects(pathNames) {
    const PATH_COLOR = 0x0000ff;
    model.traverse((child) => {
        if (child.name && pathNames.includes(child.name)) {
            // If child has a mesh, change its material color
            if (child.isMesh && child.material) {
                child.material = child.material.clone(); // avoid affecting other meshes
                child.material.color.setHex(PATH_COLOR);
                child.visible = true;
            }
        }
    });
}

// Clear all path highlights
function hidePathObjects() {
    const roadObjects = getBlenderObjects("road");
    roadObjects.forEach((obj) => {
        if (obj.isMesh) {
            // Hide all path objects completely
            obj.visible = false;
        }
    });
}

// Show all path objects
function showAllPathObjects() {
    const roadObjects = getBlenderObjects("road");
    roadObjects.forEach((obj) => {
        if (obj.isMesh) {
            obj.visible = true;
        }
    });
}

function findPathBetweenCoords(startCoords, endCoords,objects) {
    const startObj = findClosestObjectToCoords(startCoords, objects);
    console.debug("closest obj to start :", startObj)
    const endObj = findClosestObjectToCoords(endCoords, objects);
    console.debug("closest obj to end :", endObj)

    if (!startObj.object || !endObj.object) {
        console.error("Could not find closest objects for given coordinates.");
        return { path: [], distance: Infinity };
    }

    console.debug("Closest to start:", startObj.object.name, "at distance", startObj.distance);
    console.debug("Closest to end:", endObj.object.name, "at distance", endObj.distance);

    const { graph } = checkIntersectionsAndBuildGraph(objects);
    const result = graph.dijkstra(startObj.object.name, endObj.object.name);

    return result;
}

function showPathBetweenCoords(startCoords, endCoords){
    const roadObjects = getBlenderObjects("road");
    const result = findPathBetweenCoords(startCoords, endCoords,roadObjects)
    ShowPathObjects(result.path)
}

function findPathBetweenObjects(locationObjects) {
    // Find shortest path between two objects 
    if (roadObjects.length >= 2) {
        if (locationObjects.length >= 2) {
            const startCords = locationObjects[0].position;
            const endCords = locationObjects[1].position;
            const result = findPathBetweenCoords(startCords, endCords, roadObjects);
            console.debug("Shortest path from", startCords, "to", endCords, "is", result.path);
            console.debug(`Total distance:`, result.distance);
            ShowPathObjects(model, result.path);
        }
    }
}

function highlightAllPathRed(){
    // highlight the road objects with red boundry
    const roadObjects = getBlenderObjects("road");
    for (const obj of roadObjects) {
        const box = new THREE.Box3().setFromObject(obj);
        const helper = new THREE.Box3Helper(box, 0xff0000);
        globalScene.add(helper);

        // console.log(obj.name, obj.position.x, obj.position.y, obj.position.z);
        // camera.position.set(obj.position.x, obj.position.y, obj.position.z);
        // await sleep(1000);
    }
}

// Get blender objects and process intersections
function getBlenderObjects(prefix) {
    const objects = [];
    model.traverse((child) => {
        if (child.name && child.name.startsWith(prefix)) {
            objects.push(child);
        }
    });
    return objects;
}

function afterModelInit(){
    // highlightAllPathRed();
    hidePathObjects(); // Hide all paths by default
    url_parser();
}