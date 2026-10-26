"use client";

/**
 * Loads the Three.js scene only when it can actually be useful:
 *  - client-side only (no SSR for WebGL code),
 *  - only once the container scrolls near the viewport,
 *  - only when WebGL exists and the visitor doesn't prefer reduced motion,
 *  - paused (`frameloop="never"`) while off-screen or when the tab is hidden.
 * Until then — and permanently for unsupported visitors — the SVG fallback
 * is shown, so the search form above always works.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import SceneFallback from "./scene-fallback";
import type { SceneState } from "../types";

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => null,
});

let cachedWebGLSupport: boolean | null = null;

function getWebGLSupport(): boolean {
  // Cached: every call would otherwise create (and leak) a WebGL context,
  // which browsers cap at a handful — the real scene would then lose its own.
  if (cachedWebGLSupport !== null) return cachedWebGLSupport;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    cachedWebGLSupport = Boolean(gl);
    // Release the probe context immediately.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cachedWebGLSupport = false;
  }
  return cachedWebGLSupport;
}

function subscribeNothing(): () => void {
  return () => {};
}

function getReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

type Props = {
  state: SceneState;
};

export default function SceneLoader({ state }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  // Latched: once the scene has loaded it stays mounted (frameloop pauses
  // instead), so scrolling back and forth never creates a second WebGL
  // context — browsers only allow a handful of those.
  const [everInView, setEverInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [ready, setReady] = useState(false);

  // Externals read through the snapshot API: no setState inside effects.
  const supported = useSyncExternalStore(subscribeNothing, getWebGLSupport, () => null);
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  const quality = useMemo<"high" | "low">(
    () => (typeof window !== "undefined" && window.innerWidth < 1024 ? "low" : "high"),
    [],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) setEverInView(true);
          setInView(entry.isIntersecting);
        }),
      { rootMargin: "160px 0px" },
    );
    const element = containerRef.current;
    if (element) observer.observe(element);

    const onVisibility = () => setTabVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);

  const enabled = supported === true && !reduced;
  const mount = enabled && everInView;
  const sceneReady = mount && ready;

  return (
    <div ref={containerRef} className="relative h-full w-full" aria-hidden="true">
      {mount && (
        <HeroScene
          state={state}
          frameloop={inView && tabVisible ? "always" : "never"}
          quality={quality}
          reduced={reduced}
          onReady={onReady}
        />
      )}

      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          sceneReady ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <SceneFallback loading={enabled && everInView && !ready} />
      </div>

      {(supported === false || reduced) && (
        <p className="sr-only">
          The interactive 3D preview is disabled because this browser or your motion preferences
          don&apos;t support it. Every search feature still works.
        </p>
      )}
    </div>
  );
}
