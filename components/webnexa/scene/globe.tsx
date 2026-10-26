"use client";

/**
 * Interactive globe: textured earth, atmosphere glow, glowing connection
 * nodes, curved network arcs with travelling data packets, and a scanning
 * ring while a domain search is in flight.
 *
 * Everything animates through refs in `useFrame` — no React state, no
 * re-renders per frame.
 */
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { PALETTE, glowTexture, latLngToVector3 } from "./scene-utils";

const RADIUS = 1.6;

/** Configures a loaded earth map (kept outside the component so lint can see it is a pure setup step). */
function prepareEarthTexture(texture: THREE.Texture): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
}

/** Connection points — Kigali is included because 2moreTechs is Rwandan. */
const NODES: Array<[number, number]> = [
  [-1.94, 30.06], // Kigali
  [51.5, -0.12], // London
  [40.71, -74.0], // New York
  [1.35, 103.8], // Singapore
  [35.68, 139.69], // Tokyo
  [-33.86, 151.2], // Sydney
  [52.52, 13.4], // Berlin
  [-26.2, 28.04], // Johannesburg
  [19.43, -99.13], // Mexico City
  [-23.55, -46.63], // São Paulo
  [25.2, 55.27], // Dubai
];

const ARCS: Array<[number, number]> = [
  [0, 1],
  [1, 3],
  [3, 4],
  [4, 5],
  [0, 8],
  [0, 7],
  [2, 9],
  [6, 10],
];

function arcCurve(from: [number, number], to: [number, number]): THREE.CubicBezierCurve3 {
  const a = latLngToVector3(from[0], from[1], RADIUS);
  const b = latLngToVector3(to[0], to[1], RADIUS);
  const lift = RADIUS * 1.55;
  const c1 = a.clone().normalize().multiplyScalar(lift).lerp(b.clone().normalize().multiplyScalar(lift), 0.3);
  const c2 = a.clone().normalize().multiplyScalar(lift).lerp(b.clone().normalize().multiplyScalar(lift), 0.7);
  return new THREE.CubicBezierCurve3(a, c1, c2, b);
}

export default function Globe({
  searching,
  reduced,
  quality,
}: {
  searching: boolean;
  reduced: boolean;
  quality: "high" | "low";
}) {
  const texture = useTexture("/webnexa/earth-globe.jpg");
  useMemo(() => prepareEarthTexture(texture), [texture]);

  const spinRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<Array<THREE.Mesh | null>>([]);
  const packetPoints = useRef<THREE.Points>(null);

  const nodeGlow = useMemo(() => glowTexture(PALETTE.sky, 0.22), []);
  const atmosphereUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(PALETTE.sky) },
      uPower: { value: 2.6 },
    }),
    [],
  );
  const curves = useMemo(() => ARCS.map(([a, b]) => arcCurve(NODES[a], NODES[b])), []);
  const nodePositions = useMemo(() => NODES.map(([lat, lng]) => latLngToVector3(lat, lng, RADIUS)), []);

  // Static arc tubes (one merged geometry keeps this to a single draw call).
  const arcGeometry = useMemo(() => {
    const geometries = curves.map(
      (curve) => new THREE.TubeGeometry(curve, 40, 0.006, 5, false),
    );
    let merged: THREE.BufferGeometry | null = null;
    for (const geometry of geometries) {
      merged = merged ? mergeGeometriesSafe(merged, geometry) : geometry;
    }
    return merged ?? new THREE.BufferGeometry();
  }, [curves]);

  const packetCount = quality === "high" ? curves.length : Math.ceil(curves.length / 2);
  const packetPositions = useMemo(
    () => new Float32Array(packetCount * 3),
    [packetCount],
  );

  useFrame((_, delta) => {
    if (!reduced && spinRef.current) spinRef.current.rotation.y += delta * 0.055;
    if (haloRef.current) haloRef.current.rotation.y = spinRef.current?.rotation.y ?? 0;

    // Scanning ring: two pulses expand outward while a search is running.
    const time = performance.now() / 1000;
    ringRefs.current.forEach((ring, index) => {
      if (!ring) return;
      if (!searching) {
        ring.visible = false;
        return;
      }
      ring.visible = true;
      const t = (time * 0.55 + index * 0.5) % 1;
      const scale = 1 + t * 0.75;
      ring.scale.setScalar(scale);
      const material = ring.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - t) * 0.7;
    });

    // Packets glide along the network arcs.
    const points = packetPoints.current;
    if (points) {
      const attribute = points.geometry.getAttribute("position") as THREE.BufferAttribute;
      const speed = reduced ? 0 : 0.16;
      for (let i = 0; i < packetCount; i += 1) {
        const curve = curves[i % curves.length];
        const t = ((time * speed + i / packetCount) % 1 + 1) % 1;
        const point = curve.getPoint(t);
        attribute.setXYZ(i, point.x, point.y, point.z);
      }
      attribute.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh ref={spinRef}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          color="#eaf3fb"
          roughness={0.82}
          metalness={0.08}
          emissiveMap={texture}
          emissive={new THREE.Color("#8ab6d8")}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Atmospheric rim glow */}
      <mesh scale={1.09}>
        <sphereGeometry args={[RADIUS, 48, 48]} />
        <shaderMaterial
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={atmosphereUniforms}
          vertexShader={`
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 uColor;
            uniform float uPower;
            varying vec3 vNormal;
            void main() {
              float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), uPower);
              gl_FragColor = vec4(uColor, 1.0) * clamp(intensity, 0.0, 1.0);
            }
          `}
        />
      </mesh>

      {/* Connection nodes */}
      <group>
        {nodePositions.map((position, index) => (
          <group key={index} position={position} scale={1.01}>
            <sprite scale={[0.34, 0.34, 1]}>
              <spriteMaterial
                map={nodeGlow}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                opacity={0.85}
              />
            </sprite>
            <mesh>
              <sphereGeometry args={[0.026, 12, 12]} />
              <meshBasicMaterial color={PALETTE.white} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Network arcs */}
      <mesh geometry={arcGeometry}>
        <meshBasicMaterial
          color={PALETTE.sky}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Travelling data packets */}
      <points ref={packetPoints}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[packetPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.09}
          map={nodeGlow}
          transparent
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          color={PALETTE.pale}
          toneMapped={false}
        />
      </points>

      {/* Search scan rings — face the camera so they read as an expanding
          pulse around the globe instead of a line seen edge-on. */}
      {[0, 1].map((index) => (
        <mesh
          key={index}
          visible={false}
          position={[0, 0, -0.2]}
          ref={(element) => {
            ringRefs.current[index] = element;
          }}
        >
          <ringGeometry args={[RADIUS * 1.1, RADIUS * 1.16, 96]} />
          <meshBasicMaterial
            color={PALETTE.sky}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Minimal geometry merge — avoids pulling in three's addons for two buffers. */
function mergeGeometriesSafe(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const merged = new THREE.BufferGeometry();
  const positions = new Float32Array(
    (a.getAttribute("position").count + b.getAttribute("position").count) * 3,
  );
  positions.set(a.getAttribute("position").array as Float32Array, 0);
  positions.set(
    b.getAttribute("position").array as Float32Array,
    a.getAttribute("position").count * 3,
  );
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return merged;
}
