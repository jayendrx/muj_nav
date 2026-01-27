import { useState } from 'react';

export default function App() {
  return (
    <Canvas>
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <Box>
        
        <meshStandardMaterial color="orange" />
      </Box>
    </Canvas>
  );
}