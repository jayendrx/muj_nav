import React, { useState, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { setModel, setGlobalScene, setGlobalCamera, setGlobalControls } from './globals';
import { afterModelInit } from './helpers';

export let model = null;
export let globalScene = null;
export let globalCamera = null;
export let globalControls = null;

function ModelLoader() {
  const { scene, camera } = useThree();
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    globalScene = scene;
    globalCamera = camera;
    setGlobalScene(scene);
    setGlobalCamera(camera);
    const loader = new GLTFLoader();
    loader.load('/muj_nav/clg_with_waypoints.glb', (gltf) => {
      model = gltf.scene;
      setModel(gltf.scene);
      model.position.set(0, -1, 0);
      scene.add(model);
      setModelLoaded(true);
      afterModelInit();
    });
  }, [scene, camera]);

  return null;
}

export function Scene() {
  const controlsRef = useRef();

  useEffect(() => {
    if (controlsRef.current) {
      globalControls = controlsRef.current;
      setGlobalControls(controlsRef.current);
    }
  }, []);

  return (
    <>
      <OrbitControls 
        ref={controlsRef}
        enablePan={true}
        enableRotate={true}
        enableZoom={true}
        touchRotate={true}
        touchPan={true}
        touchZoom={true}
      />
      <ambientLight intensity={3} />
      <directionalLight position={[5, 10, 7.5]} intensity={1} />
      <ModelLoader />
      <axesHelper args={[5]} />
    </>
  );
}
