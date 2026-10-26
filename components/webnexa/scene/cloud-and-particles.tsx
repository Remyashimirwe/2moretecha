"use client";

/**
 * Small cloud-upload element plus luminous particles that travel along
 * network paths from the cloud to the globe — website data moving across
 * the internet. Counts are reduced on mobile and the whole system is driven
 * by refs, so no React renders happen per frame.
 */
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PALETTE, dotTexture, latLngToVector3 } from "./scene-utils";

const CLOUD_POSITION = new THREE.Vector3(2.75, 1.95, 0.35);
const TARGETS: Array<[number, number]> = [
  [-1.94, 30.06], // Kigali
  [51.5, -0.12], // London
  [1.35, 103.8], // Singapore
];

export default function CloudAndParticles({
  highlighted,
  quality,
  reduced,
}: {
  highlighted: boolean;
  quality: "high" | "low";
  reduced: boolean;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const dot = useMemo(() => dotTexture(), []);

  const curves = useMemo(
    () =>
      TARGETS.map(([lat, lng]) => {
        const end = latLngToVector3(lat, lng, 1.62);
        const mid = CLOUD_POSITION.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.75, 0.4));
        return new THREE.QuadraticBezierCurve3(CLOUD_POSITION.clone(), mid, end);
      }),
    [],
  );

  const count = quality === "high" ? 54 : 22;
  const positions = useMemo(() => new Float32Array(count * 3), [count]);

  useFrame((_, delta) => {
    const time = performance.now() / 1000;
    const cloud = cloudRef.current;
    if (cloud && !reduced) {
      cloud.position.y = CLOUD_POSITION.y + Math.sin(time * 0.7) * 0.07;
    }
    const root = rootRef.current;
    if (root) {
      const k = 1 - Math.pow(0.001, delta);
      root.scale.setScalar(THREE.MathUtils.lerp(root.scale.x, highlighted ? 1.08 : 1, k));
    }

    const points = pointsRef.current;
    if (!points) return;
    const attribute = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const speed = reduced ? 0 : 0.22;
    for (let i = 0; i < count; i += 1) {
      const curve = curves[i % curves.length];
      const t = (((time * speed + (i % 18) / 18) % 1) + 1) % 1;
      const point = curve.getPoint(t);
      attribute.setXYZ(i, point.x, point.y, point.z);
    }
    attribute.needsUpdate = true;
  });

  return (
    <group ref={rootRef}>
      {/* Data packets */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.11}
          map={dot}
          transparent
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          color={PALETTE.pale}
          toneMapped={false}
        />
      </points>

      {/* Cloud + upload arrow */}
      <group ref={cloudRef} position={CLOUD_POSITION} scale={0.72}>
        {[
          [0, 0, 0, 0.46],
          [0.5, 0.06, 0.05, 0.34],
          [-0.48, 0.02, 0, 0.36],
          [0.06, 0.26, -0.04, 0.34],
        ].map(([x, y, z, r], index) => (
          <mesh key={index} position={[x, y, z]}>
            <sphereGeometry args={[r, 24, 24]} />
            <meshStandardMaterial
              color={PALETTE.pale}
              roughness={0.85}
              metalness={0.05}
              emissive={new THREE.Color(PALETTE.teal)}
              emissiveIntensity={0.18}
            />
          </mesh>
        ))}
        <group position={[0, -0.62, 0.2]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.07, 0.4, 12]} />
            <meshStandardMaterial color={PALETTE.sky} emissive={new THREE.Color(PALETTE.sky)} emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <coneGeometry args={[0.19, 0.26, 16]} />
            <meshStandardMaterial color={PALETTE.sky} emissive={new THREE.Color(PALETTE.sky)} emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
        </group>
        <pointLight position={[0, -0.4, 1.2]} intensity={2.2} distance={5} color={PALETTE.sky} />
      </group>
    </group>
  );
}
