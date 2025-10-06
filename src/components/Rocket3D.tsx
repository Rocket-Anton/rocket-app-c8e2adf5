import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface Rocket3DProps {
  show: boolean;
  onComplete?: () => void;
  startPosition?: { x: number; y: number };
}

function RocketMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [progress, setProgress] = useState(0);

  useFrame((state, delta) => {
    if (meshRef.current && progress < 1) {
      // Move rocket upwards
      meshRef.current.position.y += delta * 8;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      setProgress(prev => Math.min(prev + delta * 0.3, 1));
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -5, 0]} rotation={[0, 0, -Math.PI / 4]}>
      {/* Rocket Body */}
      <group>
        {/* Main Body - Cylinder */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 2, 32]} />
          <meshStandardMaterial color="#0EA5E9" metalness={0.8} roughness={0.2} />
        </mesh>

        {/* Nose Cone */}
        <mesh position={[0, 1.3, 0]}>
          <coneGeometry args={[0.3, 0.6, 32]} />
          <meshStandardMaterial color="#60C0E8" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Fins */}
        {[0, 90, 180, 270].map((angle, i) => (
          <mesh
            key={i}
            position={[
              Math.cos((angle * Math.PI) / 180) * 0.35,
              -0.8,
              Math.sin((angle * Math.PI) / 180) * 0.35
            ]}
            rotation={[0, (angle * Math.PI) / 180, 0]}
          >
            <boxGeometry args={[0.1, 0.6, 0.4]} />
            <meshStandardMaterial color="#0284C7" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}

        {/* Engine Glow */}
        <pointLight position={[0, -1.2, 0]} intensity={2} color="#ff6600" distance={2} />
        <mesh position={[0, -1.2, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#ff6600" />
        </mesh>

        {/* Flames/Exhaust */}
        <mesh position={[0, -1.5, 0]}>
          <coneGeometry args={[0.25, 0.8, 8]} />
          <meshBasicMaterial color="#ff8800" transparent opacity={0.7} />
        </mesh>
      </group>
    </mesh>
  );
}

export const Rocket3D = ({ show, onComplete, startPosition }: Rocket3DProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      console.log("🚀 3D Raketen-Animation gestartet!");
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none z-[10001]"
      style={{
        left: startPosition?.x || "50%",
        top: startPosition?.y || "80%",
        width: "200px",
        height: "400px",
        transform: "translate(-50%, -50%)"
      }}
    >
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} color="#60C0E8" />
        <RocketMesh />
      </Canvas>
    </div>
  );
};
