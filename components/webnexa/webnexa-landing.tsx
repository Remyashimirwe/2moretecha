"use client";

/**
 * Client shell for the WebNexa landing page: a single piece of scene state
 * is shared between the header, hero, service strip and the 3D scene so that
 * hovering a service or running a search keeps every surface in sync.
 */
import { useCallback, useState } from "react";
import SiteHeader from "./site-header";
import Hero from "./hero";
import ServiceStrip from "./service-strip";
import SupportBand from "./support-band";
import { INITIAL_SCENE_STATE, type SceneState, type ServiceKey } from "./types";

export default function WebNexaLanding() {
  const [scene, setScene] = useState<SceneState>(INITIAL_SCENE_STATE);

  const patch = useCallback(
    (next: Partial<SceneState>) => setScene((current) => ({ ...current, ...next })),
    [],
  );
  const onHover = useCallback(
    (service: ServiceKey | null) => patch({ highlight: service }),
    [patch],
  );

  return (
    <>
      <SiteHeader onServiceHover={onHover} />
      <Hero scene={scene} onSceneChange={patch} />
      <ServiceStrip onHover={onHover} />
      <SupportBand />
    </>
  );
}
