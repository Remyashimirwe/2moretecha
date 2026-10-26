"use client";

/**
 * The hero's Three.js scene: globe, floating extensions, laptop, server rack,
 * security shield, cloud and data particles — composed for a 4:3 area and
 * framed responsively. Loaded lazily (dynamic import, no SSR) by `scene-loader`.
 */
import { Suspense, useEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Globe from "./globe";
import DomainLabels from "./domain-labels";
import Laptop from "./laptop";
import ServerRack from "./server-rack";
import Shield from "./shield";
import CloudAndParticles from "./cloud-and-particles";
import { PALETTE } from "./scene-utils";
import type { SceneState } from "../types";

type Props = {
  state: SceneState;
  frameloop: "always" | "never";
  quality: "high" | "low";
  reduced: boolean;
  onReady?: () => void;
};

/** Scales the composition so it always fits the visible area. */
function FitGroup({ children }: { children: ReactNode }) {
  const { viewport } = useThree();
  const scale = Math.min(1, viewport.width / 7.1, viewport.height / 6.4);
  return <group scale={scale}>{children}</group>;
}

/** Gentle mouse parallax — smoothed in the loop, never through React state. */
function Parallax({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const group = ref.current;
    if (!group) return;
    const k = 1 - Math.pow(0.002, Math.min(delta, 0.1));
    group.rotation.y += (state.pointer.x * 0.15 - group.rotation.y) * k;
    group.rotation.x += (-state.pointer.y * 0.09 - group.rotation.x) * k;
  });
  return <group ref={ref}>{children}</group>;
}

/** Subtle emphasis when a matching service link is hovered. */
function Emphasis({ active, children }: { active: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const k = 1 - Math.pow(0.001, Math.min(delta, 0.1));
    group.scale.setScalar(THREE.MathUtils.lerp(group.scale.x, active ? 1.05 : 1, k));
  });
  return <group ref={ref}>{children}</group>;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={1.15} color={PALETTE.pale} />
      <directionalLight position={[5, 6, 5]} intensity={2.6} color="#ffffff" />
      <directionalLight position={[0, 1.5, 6]} intensity={1.1} color="#ffffff" />
      <directionalLight position={[-6, -1, -4]} intensity={1.3} color={PALETTE.teal} />
      <directionalLight position={[-4, 3, 5]} intensity={0.8} color={PALETTE.sky} />
    </>
  );
}

export default function HeroScene({ state, frameloop, quality, reduced, onReady }: Props) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <Canvas
      dpr={quality === "high" ? [1, 2] : [1, 1.5]}
      frameloop={frameloop}
      camera={{ position: [0, 0.1, 7.4], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      aria-hidden
    >
      <Lights />
      <FitGroup>
        <Parallax>
          <Suspense fallback={null}>
            <Emphasis active={state.highlight === "domains"}>
              <Globe
                searching={state.phase === "searching"}
                reduced={reduced}
                quality={quality}
              />
            </Emphasis>

            <DomainLabels interactive={quality === "high"} />

            <Laptop
              state={{
                query: state.query,
                phase: state.phase,
                suggestion: state.suggestion,
                priceLabel: state.priceLabel,
                focused: state.focused,
              }}
              interactive={state.focused || state.highlight === "builder"}
            />

            <ServerRack highlighted={state.highlight === "hosting"} />

            <Shield
              highlighted={state.highlight === "security"}
              interactive={quality === "high"}
            />

            <CloudAndParticles
              highlighted={state.highlight === "email"}
              quality={quality}
              reduced={reduced}
            />
          </Suspense>
        </Parallax>
      </FitGroup>
    </Canvas>
  );
}
