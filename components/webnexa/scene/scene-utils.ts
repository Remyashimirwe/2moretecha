/**
 * Canvas/geometry helpers shared by the 3D scene.
 *
 * Every texture here is generated in-browser (no fonts or images to fetch at
 * runtime beyond the one bundled globe map), which keeps the scene
 * self-contained and offline-safe.
 */
import * as THREE from "three";

export const PALETTE = {
  navy: "#001D39",
  primary: "#0A4174",
  medium: "#49769F",
  teal: "#4E8EA2",
  lightTeal: "#6EA2B3",
  sky: "#7BBDE8",
  pale: "#BDD8E9",
  white: "#FFFFFF",
} as const;

const UI_FONT =
  '600 40px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Soft radial glow used for node halos, LEDs and the shield aura. */
export function glowTexture(color: string, hardness = 0.28): THREE.CanvasTexture {
  const size = 128;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(hardness, `${color}aa`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Circular point sprite (for the travelling data particles). */
export function dotTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(189,216,233,0.9)");
  gradient.addColorStop(1, "rgba(123,189,232,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Pill-shaped ".com" style label sprite. */
export function labelTexture(text: string, background: string, foreground: string): THREE.CanvasTexture {
  const w = 320;
  const h = 128;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.font = UI_FONT;
  const metrics = ctx.measureText(text);
  const padX = 40;
  const boxW = Math.min(w, metrics.width + padX * 2);
  const boxH = 76;
  const x = (w - boxW) / 2;
  const y = (h - boxH) / 2;

  ctx.shadowColor = "rgba(0, 29, 57, 0.55)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  roundedRect(ctx, x, y, boxW, boxH, 38);
  ctx.fillStyle = background;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.stroke();

  ctx.font = UI_FONT;
  ctx.fillStyle = foreground;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Latitude/longitude (degrees) → point on a sphere of the given radius. */
export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/** Fake contact shadow: a radial-gradient plane under a floating object. */
export function contactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(0,0,0,0.5)");
  gradient.addColorStop(0.55, "rgba(0,0,0,0.22)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
