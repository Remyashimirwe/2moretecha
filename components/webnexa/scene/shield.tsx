"use client";

/**
 * 3D security shield with a lock, gentle float and a brief hover reaction.
 * It illustrates the website-security service — it is decorative only and
 * never implies that a site is actually protected (that depends on the
 * security features being configured and verified).
 */
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { PALETTE, glowTexture } from "./scene-utils";

/** Layout scale — the hover animation multiplies this, never replaces it. */
const BASE_SCALE = 0.55;
const BASE_Y = 1.55;

function shieldGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.12);
  shape.lineTo(1, 0.64);
  shape.lineTo(1, -0.18);
  shape.bezierCurveTo(1, -0.8, 0.56, -1.16, 0, -1.32);
  shape.bezierCurveTo(-0.56, -1.16, -1, -0.8, -1, -0.18);
  shape.lineTo(-1, 0.64);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.06,
    bevelSegments: 3,
    curveSegments: 18,
  });
}

export default function Shield({ highlighted, interactive }: { highlighted: boolean; interactive: boolean }) {
  const geometry = useMemo(() => shieldGeometry(), []);
  const glow = useMemo(() => glowTexture(PALETTE.teal, 0.25), []);
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const hovered = useRef(false);

  useFrame((_, delta) => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;
    const k = 1 - Math.pow(0.001, delta);
    const active = hovered.current || highlighted;
    root.scale.setScalar(THREE.MathUtils.lerp(root.scale.x, active ? BASE_SCALE * 1.1 : BASE_SCALE, k));
    root.position.y = THREE.MathUtils.lerp(root.position.y, active ? BASE_Y + 0.12 : BASE_Y, k);
    const material = body.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = THREE.MathUtils.lerp(
      material.emissiveIntensity,
      active ? 0.65 : 0.3,
      k,
    );
  });

  return (
    <Float speed={1.15} rotationIntensity={0.18} floatIntensity={0.7} floatingRange={[-0.1, 0.1]}>
      <group
        ref={rootRef}
        position={[-2.85, BASE_Y, 0.4]}
        rotation={[0.06, 0.32, -0.05]}
        scale={BASE_SCALE}
        onPointerOver={(event) => {
          if (!interactive) return;
          event.stopPropagation();
          hovered.current = true;
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          hovered.current = false;
          document.body.style.cursor = "auto";
        }}
      >
        <sprite scale={[4.6, 4.6, 1]} position={[0, 0, -0.4]}>
          <spriteMaterial map={glow} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>

        <mesh ref={bodyRef} geometry={geometry}>
          <meshStandardMaterial
            color={PALETTE.primary}
            metalness={0.55}
            roughness={0.3}
            emissive={new THREE.Color(PALETTE.teal)}
            emissiveIntensity={0.3}
          />
        </mesh>

        {/* lock body */}
        <mesh position={[0, -0.18, 0.34]}>
          <boxGeometry args={[0.58, 0.46, 0.16]} />
          <meshStandardMaterial color={PALETTE.pale} metalness={0.35} roughness={0.35} emissive={new THREE.Color(PALETTE.sky)} emissiveIntensity={0.25} />
        </mesh>
        {/* shackle */}
        <mesh position={[0, 0.14, 0.34]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.19, 0.055, 10, 24, Math.PI]} />
          <meshStandardMaterial color={PALETTE.pale} metalness={0.45} roughness={0.3} />
        </mesh>
        {/* keyhole */}
        <mesh position={[0, -0.14, 0.44]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.06, 16]} />
          <meshStandardMaterial color={PALETTE.navy} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.26, 0.44]}>
          <boxGeometry args={[0.06, 0.16, 0.05]} />
          <meshStandardMaterial color={PALETTE.navy} roughness={0.6} />
        </mesh>

        <pointLight position={[0.6, 0.4, 1.6]} intensity={3} distance={6} color={PALETTE.sky} />
      </group>
    </Float>
  );
}
