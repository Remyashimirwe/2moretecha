"use client";

/**
 * 3D laptop whose screen mirrors the visitor's real domain search.
 *
 * The screen is a canvas texture redrawn only when the search state changes
 * (plus a throttled loop while a request is in flight) — the render loop
 * never triggers React renders and vice versa.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { PALETTE, contactShadowTexture, createCanvas, roundedRect } from "./scene-utils";

type ScreenState = {
  query: string;
  phase: "idle" | "searching" | "available" | "unavailable" | "error";
  suggestion: string | null;
  priceLabel: string | null;
  focused: boolean;
};

const W = 1280;
const H = 800;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1);
  return `${value}…`;
}

function drawScreen(ctx: CanvasRenderingContext2D, state: ScreenState, time: number): void {
  // ── Canvas ────────────────────────────────────────────────
  ctx.fillStyle = "#F7F9FD";
  ctx.fillRect(0, 0, W, H);

  // ── Browser chrome ────────────────────────────────────────
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, 84);
  ctx.fillStyle = "#E2E8F0";
  ctx.fillRect(0, 84, W, 2);
  ["#F87171", "#FBBF24", "#4ADE80"].forEach((color, i) => {
    ctx.beginPath();
    ctx.arc(38 + i * 34, 42, 11, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
  roundedRect(ctx, 150, 22, 470, 40, 20);
  ctx.fillStyle = "#EEF3F9";
  ctx.fill();
  ctx.font = `500 21px ${FONT}`;
  ctx.fillStyle = PALETTE.medium;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("webnexa.com/domain-search", 178, 43);
  ctx.font = `700 24px ${FONT}`;
  ctx.fillStyle = PALETTE.navy;
  ctx.textAlign = "right";
  ctx.fillText("WebNexa", W - 40, 43);

  // ── Headline ──────────────────────────────────────────────
  ctx.textAlign = "left";
  ctx.font = `700 54px ${FONT}`;
  ctx.fillStyle = PALETTE.navy;
  ctx.fillText("Find your domain", 80, 168);

  // ── Search pill ───────────────────────────────────────────
  const pillX = 80;
  const pillY = 214;
  const pillW = W - 160;
  const pillH = 104;
  ctx.save();
  ctx.shadowColor = state.focused ? "rgba(123,189,232,0.55)" : "rgba(10,65,116,0.14)";
  ctx.shadowBlur = state.focused ? 34 : 18;
  ctx.shadowOffsetY = 6;
  roundedRect(ctx, pillX, pillY, pillW, pillH, 52);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();
  roundedRect(ctx, pillX, pillY, pillW, pillH, 52);
  ctx.lineWidth = state.focused ? 4 : 2;
  ctx.strokeStyle = state.focused ? PALETTE.sky : "#BDD8E9";
  ctx.stroke();

  // magnifier
  ctx.beginPath();
  ctx.arc(pillX + 58, pillY + pillH / 2, 17, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = PALETTE.medium;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pillX + 71, pillY + pillH / 2 + 13);
  ctx.lineTo(pillX + 84, pillY + pillH / 2 + 26);
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.stroke();

  // input text / placeholder + caret
  const textX = pillX + 112;
  const maxTextW = pillW - 320;
  ctx.font = `600 42px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const hasQuery = state.query.trim().length > 0;
  if (hasQuery) {
    ctx.fillStyle = PALETTE.navy;
    ctx.fillText(fitText(ctx, state.query, maxTextW), textX, pillY + pillH / 2);
    if (state.focused && Math.floor(time * 2) % 2 === 0 && state.phase === "idle") {
      const shown = fitText(ctx, state.query, maxTextW);
      const caretX = textX + ctx.measureText(shown).width + 6;
      ctx.fillStyle = PALETTE.primary;
      ctx.fillRect(caretX, pillY + pillH / 2 - 26, 3, 52);
    }
  } else {
    ctx.fillStyle = "#7C93AC";
    ctx.fillText("Find your domain", textX, pillY + pillH / 2);
  }

  // in-pill action button
  const btnW = 196;
  const btnH = 68;
  const btnX = pillX + pillW - btnW - 18;
  const btnY = pillY + (pillH - btnH) / 2;
  roundedRect(ctx, btnX, btnY, btnW, btnH, 34);
  ctx.fillStyle = state.phase === "searching" ? PALETTE.medium : PALETTE.primary;
  ctx.fill();
  ctx.font = `700 26px ${FONT}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  if (state.phase === "searching") {
    const cx = btnX + 44;
    const cy = btnY + btnH / 2;
    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "#FFFFFF";
    ctx.arc(cx, cy, 14, time * 4, time * 4 + Math.PI * 0.9);
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillText("Checking…", btnX + 76, btnY + btnH / 2 + 1);
  } else {
    ctx.fillText("Search", btnX + btnW / 2, btnY + btnH / 2 + 1);
  }

  // ── Status area ───────────────────────────────────────────
  const statusY = 406;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  if (state.phase === "searching") {
    ctx.font = `600 34px ${FONT}`;
    ctx.fillStyle = PALETTE.primary;
    const dots = ".".repeat((Math.floor(time * 2) % 3) + 1);
    ctx.fillText(`Checking availability${dots}`, 80, statusY);
    ctx.font = `400 24px ${FONT}`;
    ctx.fillStyle = PALETTE.medium;
    ctx.fillText("Asking the registrar for a live answer…", 80, statusY + 44);
    // progress shimmer
    roundedRect(ctx, 80, statusY + 76, W - 160, 12, 6);
    ctx.fillStyle = "#E4EDF6";
    ctx.fill();
    roundedRect(ctx, 80, statusY + 76, (W - 160) * 0.62, 12, 6);
    ctx.fillStyle = PALETTE.sky;
    ctx.fill();
    return;
  }

  if (state.phase === "available") {
    ctx.beginPath();
    ctx.arc(104, statusY - 12, 26, 0, Math.PI * 2);
    ctx.fillStyle = "#DCFCE7";
    ctx.fill();
    ctx.strokeStyle = "#16A34A";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(92, statusY - 12);
    ctx.lineTo(102, statusY - 2);
    ctx.lineTo(118, statusY - 24);
    ctx.stroke();

    ctx.font = `700 34px ${FONT}`;
    ctx.fillStyle = PALETTE.navy;
    ctx.fillText(`${state.query || "your domain"} is available`, 148, statusY);
    ctx.font = `400 26px ${FONT}`;
    ctx.fillStyle = PALETTE.medium;
    const detail = state.priceLabel
      ? `Registered at ${state.priceLabel} — renewals shown before you pay.`
      : "Continue to see the verified price and registration options.";
    ctx.fillText(detail, 148, statusY + 44);

    roundedRect(ctx, 80, statusY + 84, 330, 72, 36);
    ctx.fillStyle = PALETTE.primary;
    ctx.fill();
    ctx.font = `700 26px ${FONT}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText("Continue to checkout", 245, statusY + 130);
    ctx.textAlign = "left";
    return;
  }

  if (state.phase === "unavailable") {
    ctx.beginPath();
    ctx.arc(104, statusY - 12, 26, 0, Math.PI * 2);
    ctx.fillStyle = "#FEE2E2";
    ctx.fill();
    ctx.strokeStyle = "#DC2626";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(94, statusY - 22);
    ctx.lineTo(114, statusY - 2);
    ctx.moveTo(114, statusY - 22);
    ctx.lineTo(94, statusY - 2);
    ctx.stroke();

    ctx.font = `700 34px ${FONT}`;
    ctx.fillStyle = PALETTE.navy;
    ctx.fillText(`${state.query} is already taken`, 148, statusY);

    if (state.suggestion) {
      ctx.font = `600 28px ${FONT}`;
      ctx.fillStyle = PALETTE.primary;
      ctx.fillText(`${state.suggestion} — checked and free`, 148, statusY + 46);
      ctx.font = `400 22px ${FONT}`;
      ctx.fillStyle = PALETTE.medium;
      ctx.fillText("Availability verified with the registrar just now.", 148, statusY + 84);
    } else {
      ctx.font = `400 24px ${FONT}`;
      ctx.fillStyle = PALETTE.medium;
      ctx.fillText("Try another name or extension.", 148, statusY + 46);
    }
    return;
  }

  // idle / error
  ctx.font = `600 30px ${FONT}`;
  ctx.fillStyle = state.phase === "error" ? "#DC2626" : PALETTE.primary;
  ctx.fillText(state.phase === "error" ? "We couldn't check that name" : "Search .com, .net, .org and more", 80, statusY);
  ctx.font = `400 24px ${FONT}`;
  ctx.fillStyle = PALETTE.medium;
  ctx.fillText("Live availability, clear yearly pricing, no surprises.", 80, statusY + 42);

  ctx.font = `500 20px ${FONT}`;
  ctx.fillStyle = "#94A3B8";
  ctx.fillText("Powered by 2moreTechs", 80, H - 40);
}

/** Layout scale — the hover animation multiplies this, never replaces it. */
const BASE_SCALE = 0.5;

/** Tells three the canvas behind this texture changed (setup lives outside React). */
function markDirty(texture: THREE.CanvasTexture): void {
  texture.needsUpdate = true;
}

export default function Laptop({ state, interactive }: { state: ScreenState; interactive: boolean }) {
  const canvas = useMemo(() => createCanvas(W, H), []);
  const texture = useMemo(() => {
    const value = new THREE.CanvasTexture(canvas);
    value.colorSpace = THREE.SRGBColorSpace;
    value.anisotropy = 4;
    return value;
  }, [canvas]);
  const shadow = useMemo(() => contactShadowTexture(), []);

  const rootRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const paint = useCallback(
    (time: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawScreen(ctx, state, time);
      markDirty(texture);
    },
    [canvas, state, texture],
  );

  // Redraw whenever the search state changes.
  useEffect(() => {
    paint(0);
  }, [paint]);

  // Animated bits (caret, spinner, shimmer) only while they can change.
  useEffect(() => {
    const animate = state.phase === "searching" || (state.focused && state.phase === "idle");
    if (!animate) return;
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      // ~20 fps is plenty for a small screen texture.
      if (now - last > 50) {
        last = now;
        paint(now / 1000);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state.phase, state.focused, paint]);

  useFrame((_, delta) => {
    const root = rootRef.current;
    const glow = glowRef.current;
    if (!root || !glow) return;
    const target = interactive && state.focused ? BASE_SCALE * 1.04 : BASE_SCALE;
    const k = 1 - Math.pow(0.001, delta);
    root.scale.setScalar(THREE.MathUtils.lerp(root.scale.x, target, k));
    const material = glow.material as THREE.MeshBasicMaterial;
    const targetOpacity = interactive && state.focused ? 0.5 : 0.16;
    material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, k);
  });

  return (
    <group ref={rootRef} position={[1.95, -1.92, 1.15]} rotation={[0, -0.36, 0]} scale={BASE_SCALE}>
      {/* contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.07, 0.15]}>
        <planeGeometry args={[4.6, 3.4]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={0.55} />
      </mesh>

      {/* base */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 0.1, 2]} />
        <meshStandardMaterial color="#A9BACB" metalness={0.72} roughness={0.34} />
      </mesh>
      {/* keyboard well */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.055, -0.2]}>
        <planeGeometry args={[2.6, 1.25]} />
        <meshStandardMaterial color="#6E8298" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* trackpad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.056, 0.62]}>
        <planeGeometry args={[1.1, 0.6]} />
        <meshStandardMaterial color="#8FA2B6" metalness={0.5} roughness={0.45} />
      </mesh>

      {/* lid */}
      <group position={[0, 0.05, -0.98]} rotation={[-0.26, 0, 0]}>
        <mesh position={[0, 0.95, 0]}>
          <boxGeometry args={[3, 1.92, 0.08]} />
          <meshStandardMaterial color="#0E1B2E" metalness={0.6} roughness={0.42} />
        </mesh>
        {/* Halo around the panel: sits between the lid face and the screen so
            it back-lights the edges instead of washing out the display. */}
        <mesh ref={glowRef} position={[0, 0.95, 0.05]}>
          <planeGeometry args={[3.3, 2.2]} />
          <meshBasicMaterial
            color={PALETTE.sky}
            transparent
            opacity={0.16}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.95, 0.06]}>
          <planeGeometry args={[2.78, 1.7]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
