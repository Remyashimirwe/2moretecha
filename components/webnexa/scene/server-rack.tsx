"use client";

/**
 * Compact server rack: brushed-metal chassis, rack units and status LEDs
 * that pulse gently. Purely illustrative — it is never presented as live
 * monitoring data (the accompanying copy carries the real message).
 * The "hosting" hover state gives it a subtle lift.
 */
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PALETTE, contactShadowTexture } from "./scene-utils";

const UNITS = 6;
const LED_COLORS = ["#4ADE80", "#4ADE80", "#7BBDE8", "#4ADE80", "#FBBF24", "#4ADE80"];
/** Layout scale — the hover animation multiplies this, never replaces it. */
const BASE_SCALE = 0.52;
const BASE_Y = -1.3;

export default function ServerRack({ highlighted }: { highlighted: boolean }) {
  const rootRef = useRef<THREE.Group>(null);
  const ledRefs = useRef<Array<THREE.Mesh | null>>([]);
  const shadow = useMemo(() => contactShadowTexture(), []);
  const ledBases = useMemo(
    () => LED_COLORS.map((color) => new THREE.Color(color)),
    [],
  );

  useFrame((_, delta) => {
    const time = performance.now() / 1000;
    const root = rootRef.current;
    if (root) {
      const target = highlighted ? BASE_SCALE * 1.07 : BASE_SCALE;
      const k = 1 - Math.pow(0.001, delta);
      root.scale.setScalar(THREE.MathUtils.lerp(root.scale.x, target, k));
      root.position.y = THREE.MathUtils.lerp(
        root.position.y,
        highlighted ? BASE_Y + 0.12 : BASE_Y,
        k,
      );
    }

    ledRefs.current.forEach((mesh, index) => {
      if (!mesh) return;
      const material = mesh.material as THREE.MeshBasicMaterial;
      const pulse = 0.55 + 0.45 * Math.sin(time * (1.6 + index * 0.35) + index);
      material.color.copy(ledBases[index % ledBases.length]).multiplyScalar(0.35 + 0.75 * pulse);
    });
  });

  return (
    <group ref={rootRef} position={[-2.75, BASE_Y, 0.35]} rotation={[0, 0.36, 0]} scale={BASE_SCALE}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.12, 0.1]}>
        <planeGeometry args={[3, 2.4]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0.5} />
      </mesh>

      {/* chassis */}
      <mesh>
        <boxGeometry args={[1.25, 2.2, 0.85]} />
        <meshStandardMaterial color="#1D466B" metalness={0.62} roughness={0.4} />
      </mesh>

      {/* rack ears */}
      {[-0.68, 0.68].map((x) => (
        <mesh key={x} position={[x, 0, 0.06]}>
          <boxGeometry args={[0.1, 2.2, 0.7]} />
          <meshStandardMaterial color="#12314B" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}

      {/* rack units with status LEDs */}
      {Array.from({ length: UNITS }).map((_, index) => {
        const y = 0.86 - index * 0.34;
        return (
          <group key={index} position={[0, y, 0.44]}>
            <mesh>
              <boxGeometry args={[1.1, 0.27, 0.04]} />
              <meshStandardMaterial
                color={index % 2 === 0 ? "#0E2B45" : "#17436A"}
                metalness={0.5}
                roughness={0.55}
              />
            </mesh>
            {/* drive bays */}
            {[-0.3, -0.05].map((x) => (
              <mesh key={x} position={[x, 0, 0.03]}>
                <boxGeometry args={[0.2, 0.13, 0.02]} />
                <meshStandardMaterial color="#07182A" metalness={0.4} roughness={0.7} />
              </mesh>
            ))}
            {/* vent slots */}
            {[0.16, 0.24, 0.32].map((x) => (
              <mesh key={x} position={[x, 0, 0.03]}>
                <boxGeometry args={[0.06, 0.13, 0.01]} />
                <meshStandardMaterial color="#07182A" roughness={0.85} />
              </mesh>
            ))}
            <mesh
              position={[0.47, 0, 0.05]}
              ref={(element) => {
                ledRefs.current[index] = element;
              }}
            >
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshBasicMaterial toneMapped={false} />
            </mesh>
            <sprite position={[0.47, 0, 0.07]} scale={[0.36, 0.36, 1]}>
              <spriteMaterial
                color={LED_COLORS[index]}
                transparent
                opacity={0.45}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </sprite>
          </group>
        );
      })}

      {/* top vents */}
      {[-0.3, -0.1, 0.1, 0.3].map((x) => (
        <mesh key={x} position={[x, 1.11, 0]}>
          <boxGeometry args={[0.14, 0.02, 0.7]} />
          <meshStandardMaterial color="#0A1E31" roughness={0.9} />
        </mesh>
      ))}

      <pointLight position={[1.4, 0.6, 1.4]} intensity={7} distance={6} color={PALETTE.sky} />
    </group>
  );
}
