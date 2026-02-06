import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Grid } from '@react-three/drei'
import { Suspense } from 'react'

function Model() {
  const { scene } = useGLTF('/model.glb')
  return (
    <primitive
      object={scene}
      scale={0.007}
      position={[0, -1.5, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  )
}

export default function Hero3D() {
  return (
    <div
      className="hero-3d-container"
      style={{
        position: "fixed",
        top: 0,
        left: 80,
        width: "calc(100vw - 80px)",
        height: "100vh",
        background: "#ffffff",
        zIndex: 1
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
      >
        <color attach="background" args={['#ffffff']} />
        
        <Suspense fallback={null}>
          <ambientLight intensity={2} />
          <directionalLight position={[0, 5, 10]} intensity={2} />
          <directionalLight position={[0, 5, -10]} intensity={2} />
          <directionalLight position={[-10, 5, 0]} intensity={2} />
          <directionalLight position={[10, 5, 0]} intensity={2} />
          <directionalLight position={[0, 15, 0]} intensity={1.5} />
          <directionalLight position={[10, 10, 10]} intensity={1.5} />
          <directionalLight position={[-10, 10, 10]} intensity={1.5} />
          <directionalLight position={[10, 10, -10]} intensity={1.5} />
          <directionalLight position={[-10, 10, -10]} intensity={1.5} />
          <pointLight position={[5, 0, 5]} intensity={1.5} />
          <pointLight position={[-5, 0, 5]} intensity={1.5} />
          <pointLight position={[5, 0, -5]} intensity={1.5} />
          <pointLight position={[-5, 0, -5]} intensity={1.5} />
          <spotLight 
            position={[0, 10, 0]} 
            intensity={2}
            angle={0.6}
            penumbra={1}
          />
          
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
          
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.01, 0]} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial 
              color="#000000" 
              transparent 
              opacity={0.1}
            />
          </mesh>
          
          <Model />
          
          <OrbitControls 
            target={[0, -1.5, 0]}
            enableZoom={true}
            enablePan={true}
            enableRotate={true}
          />
        </Suspense>
      </Canvas>
      
      {/* 3D Controls indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 20,
          color: "#666",
          background: "rgba(255,255,255,0.9)",
          padding: "10px 15px",
          borderRadius: "8px",
          fontSize: "13px",
          border: "1px solid #ddd",
          pointerEvents: "none"
        }}
      >
        <div>🖱️ Drag: Rotate</div>
        <div>🖱️ Right: Pan</div>
        <div>🖱️ Scroll: Zoom</div>
      </div>
    </div>
  )
}