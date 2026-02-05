import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { Suspense, useState } from 'react'

function Model() {
  const { scene } = useGLTF('/model.glb')
  return (
    <primitive
      object={scene}
      scale={0.006}
      position={[0, -3, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  )
}

export default function Hero3D() {
  const [isRotating, setIsRotating] = useState(true)

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "auto"
      }}
    >
      {/* ADD THE BUTTON HERE - before Canvas */}
      <button
        onClick={() => setIsRotating(!isRotating)}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 10,
          padding: "10px 20px",
          cursor: "pointer",
          backgroundColor: "white",
          border: "2px solid black",
          borderRadius: "5px"
        }}
      >
        {isRotating ? "Pause" : "Play"}
      </button>

      <Canvas
        camera={{ 
          position: [0, -1, 8],
          fov: 50
        }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[5, 5, 5]} intensity={2} />
          <directionalLight position={[-5, 3, -5]} intensity={1} />
          <pointLight position={[0, 5, 0]} intensity={1} />
          
          <Model />
          
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={true}
            autoRotate={isRotating}
            autoRotateSpeed={1.2}
            target={[0, -1.5, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}