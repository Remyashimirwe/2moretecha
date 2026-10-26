"use client";

/**
 * Floating domain-extension labels (.com, .net, .org, .co.tz) drawn as
 * canvas-texture sprites — no external font files, so they always render.
 * Gentle bobbing via drei's Float; a restrained scale-up on hover.
 */
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { PALETTE, labelTexture } from "./scene-utils";

type LabelSpec = {
  text: string;
  background: string;
  foreground: string;
  position: [number, number, number];
  speed: number;
  floatIntensity: number;
  rotation: number;
};

const LABELS: LabelSpec[] = [
  { text: ".com", background: PALETTE.sky, foreground: PALETTE.navy, position: [1.95, 1.5, 0.85], speed: 1.1, floatIntensity: 0.7, rotation: 0.06 },
  { text: ".net", background: PALETTE.teal, foreground: "#FFFFFF", position: [-1.9, 1.35, 0.85], speed: 0.9, floatIntensity: 0.6, rotation: -0.05 },
  { text: ".org", background: PALETTE.lightTeal, foreground: PALETTE.navy, position: [2.2, -0.5, 0.95], speed: 1.25, floatIntensity: 0.8, rotation: 0.04 },
  { text: ".co.tz", background: PALETTE.primary, foreground: PALETTE.pale, position: [-2.2, -0.55, 0.95], speed: 1, floatIntensity: 0.65, rotation: -0.07 },
];

function DomainLabel({ spec, interactive }: { spec: LabelSpec; interactive: boolean }) {
  const texture = useMemo(
    () => labelTexture(spec.text, spec.background, spec.foreground),
    [spec.text, spec.background, spec.foreground],
  );
  const groupRef = useRef<THREE.Group>(null);
  const hovered = useRef(false);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const target = hovered.current ? 1.14 : 1;
    const k = 1 - Math.pow(0.001, delta);
    const next = THREE.MathUtils.lerp(group.scale.x, target, k);
    group.scale.setScalar(next);
  });

  return (
    <Float
      speed={spec.speed}
      rotationIntensity={spec.rotation * 6}
      floatIntensity={spec.floatIntensity}
      floatingRange={[-0.08, 0.08]}
    >
      <group
        ref={groupRef}
        position={spec.position}
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
        <sprite scale={[1.18, 0.47, 1]}>
          <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      </group>
    </Float>
  );
}

export default function DomainLabels({ interactive }: { interactive: boolean }) {
  return (
    <group>
      {LABELS.map((spec) => (
        <DomainLabel key={spec.text} spec={spec} interactive={interactive} />
      ))}
    </group>
  );
}
