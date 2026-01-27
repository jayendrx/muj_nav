import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './Scene';
import { getBlenderObjects, highlightPathBetweenSelectedObjects } from './helpers';
import { getModel, getGlobalCamera, getGlobalControls } from './globals';
import './style.css';

function App() {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [locationObjects, setLocationObjects] = useState([]);

  const handleResetView = () => {
    const globalCamera = getGlobalCamera();
    const globalControls = getGlobalControls();
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
      const model = getModel();
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

export default App;