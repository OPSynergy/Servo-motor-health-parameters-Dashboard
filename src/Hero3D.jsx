import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Grid } from '@react-three/drei'
import { Suspense } from 'react'

function Model() {
  const { scene } = useGLTF('/model.glb')
  return (
    <primitive
      object={scene}
      scale={0.007}
      position={[0, -3, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  )
}

export default function Hero3D() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#ffffff"
      }}
    >
      <Canvas
        camera={{ 
          position: [8, 4, 8],
          fov: 45
        }}
        gl={{ 
          alpha: true,
          antialias: true 
        }}
        style={{ background: '#ffffff' }}
      >
        <color attach="background" args={['#ffffff']} />
        
        <Suspense fallback={null}>
          {/* Ambient light - base illumination */}
          <ambientLight intensity={2} />
          
          {/* Directional lights from all sides */}
          {/* Front */}
          <directionalLight position={[0, 5, 10]} intensity={2} />
          {/* Back */}
          <directionalLight position={[0, 5, -10]} intensity={2} />
          {/* Left */}
          <directionalLight position={[-10, 5, 0]} intensity={2} />
          {/* Right */}
          <directionalLight position={[10, 5, 0]} intensity={2} />
          {/* Top */}
          <directionalLight position={[0, 15, 0]} intensity={1.5} />
          
          {/* Corner lights for even coverage */}
          <directionalLight position={[10, 10, 10]} intensity={1.5} />
          <directionalLight position={[-10, 10, 10]} intensity={1.5} />
          <directionalLight position={[10, 10, -10]} intensity={1.5} />
          <directionalLight position={[-10, 10, -10]} intensity={1.5} />
          
          {/* Point lights around the model */}
          <pointLight position={[5, 0, 5]} intensity={1.5} />
          <pointLight position={[-5, 0, 5]} intensity={1.5} />
          <pointLight position={[5, 0, -5]} intensity={1.5} />
          <pointLight position={[-5, 0, -5]} intensity={1.5} />
          
          {/* Spot light from top for focus */}
          <spotLight 
            position={[0, 10, 0]} 
            intensity={1.5}
            angle={0.6}
            penumbra={1}
          />
          
          {/* Black tinted grid floor */}
          <Grid
            args={[30, 30]}
            cellSize={1}
            cellThickness={0.6}
            cellColor="#666666"
            sectionSize={5}
            sectionThickness={1.5}
            sectionColor="#333333"
            fadeDistance={50}
            infiniteGrid={true}
            position={[0, -3, 0]}
          />
          
          {/* Semi-transparent black plane under the grid for tint effect */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.01, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial 
              color="#000000" 
              transparent 
              opacity={0.1}
            />
          </mesh>
          
          <Model />
          
          <OrbitControls />
        </Suspense>
      </Canvas>
      
      {/* Instructions */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          color: "#000000",
          background: "rgba(255,255,255,0.9)",
          padding: "15px",
          borderRadius: "8px",
          fontSize: "14px",
          border: "1px solid #ddd"
        }}
      >
      </div>
    </div>
  )
}